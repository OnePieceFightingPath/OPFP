(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var editId = params.get('edit');
  var host = document.getElementById('postEditRoot');
  var current = null;

  function closePage() {
    location.href = 'detail.html?type=board';
  }

  function savePost(editor) {
    var data = editor.getData();
    if (!data.title) return showToast('제목을 입력해주세요.', 'error');
    if (!data.hasContent) return showToast('본문을 입력해주세요.', 'error');
    if (!currentUser || !currentUserProfile) return showToast('로그인 후 이용해주세요.', 'error');
    var payload = { title: data.title, prefix: data.prefix, text: data.text, editedAt: firebase.firestore.FieldValue.serverTimestamp() };
    var request = editId
      ? db.collection('boards').doc(editId).update(payload)
      : db.collection('boards').add(Object.assign(payload, {
        uid: currentUser.uid,
        author: currentUserProfile.nickname || '익명',
        avatar: currentUserProfile.avatar || '',
        likedBy: [], dislikedBy: [], likeCount: 0, commentCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }));
    var submit = host.querySelector('[data-action="submit"]');
    if (submit) submit.disabled = true;
    request.then(function (ref) {
      showToast(editId ? '게시글이 수정되었습니다.' : '게시글이 등록되었습니다.', 'success');
      setTimeout(function () { location.href = 'detail.html?type=board' + (editId ? '&id=' + encodeURIComponent(editId) : ''); }, 350);
      return ref;
    }).catch(function () {
      if (submit) submit.disabled = false;
      showToast('게시글 저장에 실패했습니다. 다시 시도해주세요.', 'error');
    });
  }

  function init() {
    if (!host) return;
    var start = function () {
      var initial = current || {};
      var editor = OPFPMobileBoardEditor.render(host, {
        editorId: 'post-edit-editor',
        initial: initial,
        onCancel: closePage,
        onSubmit: savePost
      })._opfpApi;
      if (editId && !current) {
        db.collection('boards').doc(editId).get().then(function (snap) {
          if (!snap.exists) return showToast('게시글을 찾을 수 없습니다.', 'error');
          current = snap.data();
          editor = OPFPMobileBoardEditor.render(host, { editorId: 'post-edit-editor', initial: current, onCancel: closePage, onSubmit: savePost })._opfpApi;
        });
      }
    };
    var waitForProfile = function () {
      if (currentUser && currentUserProfile) return start();
      if (!currentUser) return start();
      setTimeout(waitForProfile, 80);
    };
    if (window.authReady) window.authReady.then(waitForProfile); else waitForProfile();
  }
  document.addEventListener('DOMContentLoaded', init);
}());