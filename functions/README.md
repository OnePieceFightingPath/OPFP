# FPPatch notifications

This bundle connects the existing notification inbox to server-generated
Firestore notifications and Firebase Cloud Messaging (FCM) web push. OS pushes
work on supported browsers over HTTPS after the user opts in on the device.

## Delivery behavior

- **Patch notes:** new published `patchNotes` are sent to accounts with
  `settings.patch === true`.
- **Favorite balance patches:** new or changed published `pvpPatch` documents
  are sent to opted-in accounts with a matching ID in `favChars` or
  `favSupports`.
- **Comments:** new `boardComments` and `eventComments` notify the target
  author's account when it has `settings.comment === true`. Reply-shaped
  documents (`parentCommentId`, `replyToId`, or `parentId`) notify the parent
  comment's author.
- **Events:** newly published `events` notify accounts with `settings.event
  === true`; an hourly scheduled job sends a single ending-soon alert when an
  event deadline is within 25 hours. Date-only deadlines are treated as 23:59
  Korea time.

Every notification is saved under
`users/{uid}/notifications/{notificationId}`. The current site reads that path.
FCM device tokens are stored separately under
`users/{uid}/fcmTokens/{deviceId}`. Firebase Functions use the Admin SDK for
server writes and FCM delivery; client rules allow users to read/mark their own
notifications and manage only their own device tokens.

## Required Firebase setup

1. In Firebase Console, open **Project settings → Cloud Messaging → Web Push
   certificates** and copy the project's public VAPID key.
2. Set `WEB_PUSH_VAPID_KEY` in `js/Firebase.js` to that public key. It is
   intentionally blank in this source bundle; without the project's VAPID key,
   browsers cannot register an FCM token.
3. Host the site on HTTPS with `firebase-messaging-sw.js` at the site root.
   Users then sign in, enable one or more notification categories, and tap
   **이 기기 푸시 켜기** once in the notification settings. The browser asks
   for OS notification permission at that point.

The public event page currently loads visual banners from the `banners`
collection; the separate `eventBanners` collection is retained because the
FPPatchStudio administrator uses it to manage event-banner data.

The public customer-service form writes to `inquiries`, including the account
UID and nickname. Users can read their own inquiries; administrators with the
`support` section permission can update only the status, reply, and reply-admin
nickname fields needed by the support workflow. New inquiries store the
requester's account nickname. When an inquiry is marked `완료됨` with a
non-empty reply, `onInquiryAnswered` creates a `support` notification under
`users/{uid}/notifications`. Selecting it opens
`CustomerService.html#my-inquiries`, which opens the user's inquiry dialog and
shows the saved reply. FCM is sent only to devices that have an active token.

The FPPatchStudio admin notification popover still reads the separate
`supportInquiries` collection. That administrator-side new-inquiry alert is
separate from the user-facing reply notification described above.

## Deploy

`firestore.rules` is based on the supplied latest rules. It retains rules used
by the separate FPPatchStudio admin app, adds the paths needed by notifications,
FCM tokens, inquiries, character tips, and admin dashboard reads, and uses
`patchViewers`, `eventViewers`, and `boardViews` for public view counters. It
removes unused `withdrawalBlocks` and legacy `userTips` rules. The live rules
are not changed by this ZIP.

From the repository root:

```sh
npm --prefix functions install
firebase login
firebase deploy --only firestore:rules,functions --project fighting-path-patch
```

Deployment requires permission to update the Firebase project. The scheduled
function requires a billing plan that supports Cloud Scheduler; Firebase may
prompt to enable Google Cloud APIs. Match the Functions region in
`functions/index.js` to the Firestore database region if it is not
`asia-northeast3`.

The FPPatchStudio admin rules panel now fetches this `firestore.rules` file
from the public `STGFPPatch_V2` main branch, so publish the rules file there
before expecting the admin panel's **규칙 복사** button to show the new rules.

## Verify

1. Deploy the rules and functions, then configure the public VAPID key.
2. Sign in on a supported HTTPS browser, enable a category and tap
   **이 기기 푸시 켜기**. Check that the status changes to receiving OS pushes.
3. Create a published patch note/event or comment on a test account's post.
   Confirm the OS notification arrives with the right category and opens the
   related page when tapped.
4. Check Settings → 알림 정보 to confirm the same item appears in the inbox
   and can be marked read.

New content is processed after deployment; old patch notes and events are not
backfilled. A comment notification requires the target document to store its
owner UID in `authorId`, `uid`, `userId`, `ownerId`, or `createdBy`. A background
push uses the same notification ID as its OS notification tag, so Firebase
trigger retries replace rather than stack duplicate notifications.
