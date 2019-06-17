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

        SweetAlert.swal({
            html: true,
            title: $filter('translate')('OTM.CONTENT.VIEW.MEETING.COPY.ALREADY-DRAFT.SOMEONE-ELSE.TITLE', {authorFullname:  lastDraftMeeting.author.fullname});,
            type: 'warning',
            cancelButtonText: $filter('translate')('OTM.WARNINGS.CANCEL'),
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
