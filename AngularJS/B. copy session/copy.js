'use strict';

/**
 * @ngdoc function
 * @name uiApp.controller:CopyMeetingDialogCtrl
 *
 */

angular.module('uiApp').controller('CopyMeetingDialogCtrl', function ($scope, $log, ngDialog, MeetService, AccountService, ActiveDialogService, NavigationService, SeriesService, $filter, SweetAlert) {
  // init
  var _this = this;
  _this.copyType = 'template';
  _this.closeCurrent = true;
  _this.meeting =  ActiveDialogService.getActive();
  _this.sessionClosed = _this.meeting.statusFinished;

  SeriesService.isLastInSerie(_this.meeting.id, _this.meeting.serieId).then(function () {
    _this.isLastInSerie = true;
  }, function () {
    _this.isLastInSerie = false;
  });

  _this.submit = function() {

    if (_this.copyType === 'template') {
      createCopiedDraftMeeting();
    }

    if (_this.copyType === 'serie') {

      if (!_this.sessionClosed && _this.closeCurrent === true) {

        var closeMeetingDialog = ngDialog.open({
          template: 'views/directives/vendor/ngdialog/meeting/close.html'
        });

        closeMeetingDialog.closePromise.then(function (result) {
          if (_.isObject(result.value)) {
            createSerieDraftMeeting(_this.closeCurrent, result.value.shouldNotify);
          }
        });

      } else {
         // The original session is already closed
        createSerieDraftMeeting(false, false);
      }
    }
  };

  _this.goLastInSerie = function () {
    SeriesService.getLastInSerie(_this.meeting.id, _this.meeting.serieId).then(function (lastMeeting) {
      NavigationService.go('root.list.view.meet', {menuitem: 'inbox', dialogId: lastMeeting.id}, {reset: true});
      ngDialog.closeAll();
    });
  };

  // if _this.copyType === 'serie'
  var createSerieDraftMeeting = function (closeCurrent, shouldNotify) {

    // We check before if there is already a waiting draft in the serie...
    SeriesService.getLastDraftInSerie(_this.meeting.id, _this.meeting.serieId).then(
      function (lastDraftMeeting) {
        // There is already a draft, so...
        var title = '';
        var content = '';
        var confirmButtonText = '';
        var showCancelButton = false;

        // We change the alert content according to the author of the draft (current user or someone else)
        if (AccountService.getCurrentUser().id !== lastDraftMeeting.author.id) {

          title = $filter('translate')('OTM.CONTENT.VIEW.MEETING.COPY.ALREADY-DRAFT.SOMEONE-ELSE.TITLE', {authorFullname:  lastDraftMeeting.author.fullname});
          content = $filter('translate')('OTM.CONTENT.VIEW.MEETING.COPY.ALREADY-DRAFT.SOMEONE-ELSE.CONTENT', {authorFullname:  lastDraftMeeting.author.fullname, authorEmail: lastDraftMeeting.author.email});
          confirmButtonText = $filter('translate')('OTM.CONTENT.VIEW.MEETING.COPY.ALREADY-DRAFT.SOMEONE-ELSE.BUTTON');

          showCancelButton = false;
        }
        else {

          title = $filter('translate')('OTM.CONTENT.VIEW.MEETING.COPY.ALREADY-DRAFT.YOU.TITLE');
          content = $filter('translate')('OTM.CONTENT.VIEW.MEETING.COPY.ALREADY-DRAFT.YOU.CONTENT');
          confirmButtonText = $filter('translate')('OTM.CONTENT.VIEW.MEETING.COPY.ALREADY-DRAFT.YOU.BUTTON');

          showCancelButton = true;
        }

        SweetAlert.swal({
            html: true,
            title: title,
            text: content,
            type: 'warning',
            showCancelButton: showCancelButton,
            // confirmButtonColor: '#52CC78',
            cancelButtonText: $filter('translate')('OTM.WARNINGS.CANCEL'),
            confirmButtonText: confirmButtonText
          }, function (isConfirmed) {
            // If the current user was the author, if he wants, we can directly redirect him to his drafts
            if (showCancelButton && isConfirmed) {
              NavigationService.go('root.drafts.edit', {dialogId: lastDraftMeeting.id});
              ngDialog.closeAll();
            }
          });
      },
      function () {
        // Error 404 = no other open draft
        MeetService.createSerieCopiedDraft(_this.meeting.id, closeCurrent, shouldNotify).then(function (newDraft) {
          NavigationService.go('root.drafts.edit', {dialogId: newDraft.id});
          ngDialog.closeAll();
        });
      });
  };

  // if _this.copyType === 'template'
  var createCopiedDraftMeeting = function () {
    MeetService.createCopiedDraft(_this.meeting.id).then(function (newDraft) {
      NavigationService.go('root.drafts.edit', {dialogId: newDraft.id});
      ngDialog.closeAll();
    });
  };
});
