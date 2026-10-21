'use strict';

const crypto = require('node:crypto');
const admin = require('firebase-admin');
const { setGlobalOptions } = require('firebase-functions/v2');
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');

admin.initializeApp();
setGlobalOptions({ region: 'asia-northeast3', maxInstances: 10 });

const db = admin.firestore();
const NOTIFICATION_PATH = (uid, id) => db.collection('users').doc(uid).collection('notifications').doc(id);
const WRITE_CONCURRENCY = 40;
const ENDING_SOON_WINDOW_MS = 25 * 60 * 60 * 1000;

function hashId(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 40);
}

function pick(data, ...keys) {
  for (const key of keys) {
    if (data && data[key] !== undefined && data[key] !== null && data[key] !== '') return data[key];
  }
  return null;
}

function userSetting(user, key) {
  return !!(user && user.settings && user.settings[key] === true);
}

function isPublished(data) {
  if (!data) return false;
  if (data.isPublished === false || data.published === false || data.isActive === false || data.visible === false) return false;
  return !/^(draft|unpublished|hidden|비공개|임시저장)$/i.test(String(data.status || '').trim());
}

function relativeHref(page, section, id) {
  return `ko/${page}#${section}/view/${encodeURIComponent(String(id))}`;
}

async function createNotification(uid, idempotencyKey, notification) {
  if (!uid) return false;
  const ref = NOTIFICATION_PATH(uid, hashId(`${uid}:${idempotencyKey}`));
  const record = {
    ...notification,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  let created = false;
  try {
    await ref.create(record);
    created = true;
  } catch (error) {
    // Firestore may retry a trigger. Do not overwrite an existing read state.
    if (!(error && (error.code === 6 || error.code === '6' || error.code === 'already-exists'))) {
      throw error;
    }
  }
  // Retry FCM sends along with a retried Firestore trigger. The service worker
  // uses the same notification ID as its OS notification tag, so retries replace
  // rather than stack duplicate notifications.
  await sendPush(uid, ref.id, notification);
  return created;
}

async function notifyUsers(users, idempotencyKey, notification) {
  let created = 0;
  for (let start = 0; start < users.length; start += WRITE_CONCURRENCY) {
    const chunk = users.slice(start, start + WRITE_CONCURRENCY);
    const results = await Promise.all(chunk.map((user) =>
      createNotification(user.id, idempotencyKey, notification)
    ));
    created += results.filter(Boolean).length;
  }
  return created;
}

function pushCopy(notification) {
  const title = String(notification.targetTitle || notification.title || '새 알림');
  if (notification.type === 'patch') return { title: '패치노트 알림', body: `${title} 패치노트를 확인해 보세요.` };
  if (notification.type === 'fav') {
    const character = String(notification.characterName || '즐겨찾기 캐릭터');
    return { title: '즐겨찾기 밸런스 패치', body: `${character}의 밸런스 패치가 등록되었습니다.` };
  }
  if (notification.type === 'comment') {
    const body = notification.isReply ? '작성하신 댓글에 답글이 달렸습니다.' : '작성하신 게시글에 댓글이 달렸습니다.';
    return { title: '댓글 알림', body };
  }
  if (notification.type === 'support') {
    return {
      title: '고객센터 답변이 등록되었습니다.',
      body: String(notification.body || '나의 문의에서 답변을 확인해 주세요.'),
    };
  }
  if (notification.type === 'event') {
    return notification.isEndingSoon
      ? { title: '이벤트 종료 임박', body: `${title} 이벤트가 곧 종료됩니다.` }
      : { title: '새 이벤트', body: `${title} 이벤트가 시작되었습니다.` };
  }
  return { title: '새 알림', body: title };
}

async function sendPush(uid, notificationId, notification) {
  const tokenSnapshot = await db.collection('users').doc(uid).collection('fcmTokens').get();
  if (tokenSnapshot.empty) return;
  const copy = pushCopy(notification);
  const link = String(notification.href || 'ko/Main.html#home');
  for (let start = 0; start < tokenSnapshot.docs.length; start += WRITE_CONCURRENCY) {
    const chunk = tokenSnapshot.docs.slice(start, start + WRITE_CONCURRENCY);
    await Promise.all(chunk.map(async (tokenDoc) => {
      const token = tokenDoc.get('token');
      if (!token) return;
      try {
        await admin.messaging().send({
          token,
          data: {
            title: copy.title,
            body: copy.body,
            link,
            type: String(notification.type || ''),
            notificationId,
          },
          webpush: { headers: { TTL: '86400' } },
        });
      } catch (error) {
        const code = error && error.code;
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
          await tokenDoc.ref.delete().catch(() => {});
          return;
        }
        // Do not log the FCM registration token. Throw transient errors so the
        // function retries while the deterministic notification remains safe.
        logger.warn('FCM delivery failed', { code: code || 'unknown' });
        throw error;
      }
    }));
  }
}

async function getEnabledUsers(settingKey) {
  const snapshot = await db.collection('users').where(`settings.${settingKey}`, '==', true).get();
  return snapshot.docs;
}

function getPvpEntities(data) {
  const chars = new Map();
  const supports = new Map();
  const baseCharId = pick(data, 'charId', 'characterId', 'id');
  const baseSupportId = pick(data, 'supportCharId', 'supportCharacterId');
  const baseName = pick(data, 'name', 'characterName');
  const rows = pick(data, 'patches', 'items', 'list');

  function add(map, id, name) {
    if (id === null || id === undefined || String(id).trim() === '') return;
    const key = String(id);
    if (!map.has(key) || (!map.get(key) && name)) map.set(key, name || '');
  }

  add(chars, baseCharId, baseName);
  add(supports, baseSupportId, pick(data, 'supportName', 'supportCharacterName'));
  if (Array.isArray(rows)) {
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      add(chars, pick(row, 'charId', 'characterId'), pick(row, 'characterName', 'name') || baseName);
      add(supports, pick(row, 'supportCharId', 'supportCharacterId'), pick(row, 'supportName', 'supportCharacterName'));
    });
  }
  return { chars, supports };
}

function numericVariants(id) {
  const values = [id];
  if (/^-?\d+$/.test(id)) {
    const numeric = Number(id);
    if (Number.isSafeInteger(numeric)) values.push(numeric);
  }
  return values;
}

async function getFavoriteUsers(entityMap, field) {
  const users = new Map();
  for (const [id, name] of entityMap.entries()) {
    const variants = numericVariants(id);
    const snapshots = await Promise.all(variants.map((value) =>
      db.collection('users').where(field, 'array-contains', value).get()
    ));
    snapshots.forEach((snapshot) => snapshot.docs.forEach((user) => {
      if (!userSetting(user.data(), 'fav')) return;
      if (!users.has(user.id)) users.set(user.id, { user, names: new Set() });
      if (name) users.get(user.id).names.add(name);
    }));
  }
  return users;
}

function pvpFingerprint(data) {
  const fields = [
    'charId', 'characterId', 'id', 'supportCharId', 'supportCharacterId',
    'name', 'characterName', 'supportName', 'supportCharacterName',
    'patchDate', 'date', 'type', 'patchType', 'kind', 'patches', 'items', 'list',
    'visible', 'isPublished', 'published', 'isActive', 'status',
  ];
  const relevant = {};
  fields.forEach((field) => {
    if (data && data[field] !== undefined) relevant[field] = data[field];
  });
  return JSON.stringify(relevant);
}

async function notifyPatchNote(patchId, eventId, data) {
  if (!isPublished(data)) return;
  const title = String(pick(data, 'title') || '새 패치노트');
  const users = await getEnabledUsers('patch');
  const created = await notifyUsers(users, `patch:${eventId}`, {
    type: 'patch',
    title: `[패치노트] ${title}`,
    targetTitle: title,
    targetId: patchId,
    targetType: 'patch',
    href: relativeHref('Community.html', 'patch', patchId),
  });
  logger.info('Patch note notifications created', { patchId, created });
}

exports.onPatchNoteCreated = onDocumentCreated('patchNotes/{patchId}', async (event) => {
  const data = event.data && event.data.data();
  if (!isPublished(data)) return;
  return notifyPatchNote(event.params.patchId, event.id, data);
});

exports.onPatchNotePublished = onDocumentUpdated('patchNotes/{patchId}', async (event) => {
  const before = event.data && event.data.before.data();
  const data = event.data && event.data.after.data();
  // Only publish transitions; edits to an already-published note don't resend.
  if (isPublished(before) || !isPublished(data)) return;
  return notifyPatchNote(event.params.patchId, event.id, data);
});

exports.onFavoriteBalancePatchChanged = onDocumentWritten('pvpPatch/{patchId}', async (event) => {
  const before = event.data && event.data.before;
  const after = event.data && event.data.after;
  if (!after || !after.exists) return;
  const data = after.data();
  if (!isPublished(data)) return;
  const fingerprint = pvpFingerprint(data);
  if (before && before.exists && pvpFingerprint(before.data()) === fingerprint) return;

  const entities = getPvpEntities(data);
  const [charUsers, supportUsers] = await Promise.all([
    getFavoriteUsers(entities.chars, 'favChars'),
    getFavoriteUsers(entities.supports, 'favSupports'),
  ]);
  const recipients = new Map();
  [charUsers, supportUsers].forEach((matches) => matches.forEach((match, uid) => {
    if (!recipients.has(uid)) recipients.set(uid, { user: match.user, names: new Set() });
    match.names.forEach((name) => recipients.get(uid).names.add(name));
  }));
  const recipientEntries = [...recipients.entries()];
  let created = 0;
  for (let start = 0; start < recipientEntries.length; start += WRITE_CONCURRENCY) {
    const chunk = recipientEntries.slice(start, start + WRITE_CONCURRENCY);
    const results = await Promise.all(chunk.map(([uid, match]) => createNotification(
      uid,
      `favorite-patch:${event.params.patchId}:${hashId(fingerprint)}`,
      {
        type: 'fav',
        title: '즐겨찾기 캐릭터 밸런스 패치',
        targetTitle: '즐겨찾기 캐릭터 밸런스 패치',
        targetId: event.params.patchId,
        targetType: 'pvp',
        href: 'ko/Main.html#pvp',
        characterName: [...match.names].join(', ') || '즐겨찾기 캐릭터',
      }
    )));
    created += results.filter(Boolean).length;
  }
  logger.info('Favorite balance-patch notifications created', {
    patchId: event.params.patchId,
    recipients: recipients.size,
    created,
  });
});

async function notifyNewEvent(eventId, triggerId, data) {
  if (!isPublished(data)) return;
  if (/^(end|ended|closed|종료|종료됨)$/i.test(String(pick(data, 'status', 'state') || '').trim())) return;
  const title = String(pick(data, 'title') || '새 이벤트');
  const users = await getEnabledUsers('event');
  const created = await notifyUsers(users, `event:${triggerId}`, {
    type: 'event',
    title: `[이벤트] ${title}`,
    targetTitle: title,
    targetId: eventId,
    targetType: 'event',
    href: relativeHref('Community.html', 'event', eventId),
  });
  logger.info('New-event notifications created', { eventId, created });
}

exports.onEventCreated = onDocumentCreated('events/{eventId}', async (event) => {
  const data = event.data && event.data.data();
  if (!isPublished(data)) return;
  return notifyNewEvent(event.params.eventId, event.id, data);
});

exports.onEventPublished = onDocumentUpdated('events/{eventId}', async (event) => {
  const before = event.data && event.data.before.data();
  const data = event.data && event.data.after.data();
  // Notify only on first publication, not on edits to an already-live event.
  if (isPublished(before) || !isPublished(data)) return;
  return notifyNewEvent(event.params.eventId, event.id, data);
});

function eventDeadline(value) {
  if (!value) return null;
  if (value && typeof value.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'number') return value > 1e12 ? value : value * 1000;

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (dateOnly) {
    // Date-only event deadlines are inclusive through 23:59:59 Korea time.
    return Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 14, 59, 59, 999);
  }
  const localDateTime = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (localDateTime) {
    return Date.parse(
      `${localDateTime[1]}-${String(localDateTime[2]).padStart(2, '0')}-${String(localDateTime[3]).padStart(2, '0')}` +
      `T${String(localDateTime[4]).padStart(2, '0')}:${localDateTime[5]}:${localDateTime[6] || '00'}+09:00`
    );
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

exports.notifyEventEndingSoon = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Asia/Seoul' },
  async () => {
    const now = Date.now();
    const events = await db.collection('events').get();
    const usersPromise = getEnabledUsers('event');
    const candidates = events.docs.filter((event) => {
      const data = event.data();
      if (!isPublished(data)) return false;
      if (/^(end|종료|종료됨)$/i.test(String(pick(data, 'status', 'state') || '').trim())) return false;
      const deadline = eventDeadline(pick(data, 'endDate', 'end', 'deadline'));
      const remaining = deadline === null ? null : deadline - now;
      return remaining !== null && remaining > 0 && remaining <= ENDING_SOON_WINDOW_MS;
    });
    if (!candidates.length) return;

    const users = await usersPromise;
    for (const event of candidates) {
      const data = event.data();
      const title = String(pick(data, 'title') || '이벤트');
      const created = await notifyUsers(users, `event-ending:${event.id}`, {
        type: 'event',
        subType: 'endingSoon',
        isEndingSoon: true,
        title: `[이벤트] ${title} 이벤트 종료 임박`,
        targetTitle: title,
        targetId: event.id,
        targetType: 'event',
        href: relativeHref('Community.html', 'event', event.id),
      });
      logger.info('Event-ending notifications created', { eventId: event.id, created });
    }
  }
);

function notificationOwner(target, isEvent) {
  return pick(target, 'authorId', 'uid', 'userId', 'ownerId', 'createdBy', ...(isEvent ? ['creatorId'] : []));
}

function inquiryReply(data) {
  return String(pick(data, 'reply', 'answer', 'adminReply', 'replyContent') || '').trim();
}

exports.onInquiryAnswered = onDocumentUpdated('inquiries/{inquiryId}', async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  const answer = inquiryReply(after);
  if (after.status !== '완료됨' || !answer) return;
  if (before.status === '완료됨' && inquiryReply(before) === answer) return;

  const uid = pick(after, 'uid', 'userId');
  if (!uid) {
    logger.warn('Support inquiry reply has no owner UID', { inquiryId: event.params.inquiryId });
    return;
  }

  const inquiryId = String(event.params.inquiryId);
  const title = String(pick(after, 'title', 'subject', 'inquiryTitle') || '고객센터 문의');
  const created = await createNotification(String(uid), `support-reply:${inquiryId}:${hashId(answer)}`, {
    type: 'support',
    subType: 'inquiry-reply',
    title: '고객센터 답변이 등록되었습니다.',
    body: `${title} 문의의 답변을 확인해 주세요.`,
    targetTitle: title,
    targetId: inquiryId,
    targetType: 'inquiry',
    href: 'ko/CustomerService.html#my-inquiries',
  });
  logger.info('Support inquiry reply notification created', {
    inquiryId,
    recipientFound: true,
    created,
  });
});

exports.onBoardCommentCreated = onDocumentCreated('boardComments/{commentId}', async (event) => {
  await handleCommentCreated(event, false);
});

exports.onEventCommentCreated = onDocumentCreated('eventComments/{commentId}', async (event) => {
  await handleCommentCreated(event, true);
});

async function handleCommentCreated(event, isEvent) {
  const comment = event.data && event.data.data();
  if (!comment) return;
  const targetId = pick(comment, 'targetId', 'postId', 'eventId');
  const senderUid = pick(comment, 'uid', 'authorId', 'userId');
  if (!targetId) return;

  const collection = isEvent ? 'eventComments' : 'boardComments';
  const targetCollection = isEvent ? 'events' : 'boards';
  const parentCommentId = pick(comment, 'parentCommentId', 'replyToId', 'parentId');
  let recipientUid = null;
  let targetTitle = '';
  let isReply = false;

  if (parentCommentId) {
    const parent = await db.collection(collection).doc(String(parentCommentId)).get();
    if (parent.exists) {
      recipientUid = notificationOwner(parent.data(), false);
      isReply = true;
    }
  } else {
    const target = await db.collection(targetCollection).doc(String(targetId)).get();
    if (target.exists) {
      recipientUid = notificationOwner(target.data(), isEvent);
      targetTitle = String(pick(target.data(), 'title') || '');
    }
  }

  if (!recipientUid || recipientUid === senderUid) return;
  const user = await db.collection('users').doc(String(recipientUid)).get();
  if (!user.exists || !userSetting(user.data(), 'comment')) return;

  const commentText = String(pick(comment, 'text', 'content') || '');
  const created = await createNotification(String(recipientUid), `comment:${event.id}`, {
    type: 'comment',
    subType: isReply ? 'reply' : 'comment',
    isReply,
    title: isReply ? '댓글 답글 알림' : '새 댓글 알림',
    body: commentText.slice(0, 500),
    targetTitle,
    targetId: String(targetId),
    targetType: isEvent ? 'event' : 'board',
    commentId: event.params.commentId,
    href: relativeHref('Community.html', isEvent ? 'event' : 'board', targetId),
  });
  logger.info('Comment notification created', {
    commentId: event.params.commentId,
    targetId: String(targetId),
    recipientFound: true,
    created,
  });
}
