'use strict';

var _config; // Define the global config var here to avoid Grunt error

/**
 * @ngdoc directive
 * @name uiApp.directive:otmViewMeetingContainer
 * @description
 * # otmViewMeetingContainer
 */
angular.module('uiApp')
        .directive('otmViewMeetingContainer', function ($log, $location, $filter, $timeout, $http, $sce, BaseService, TipsService, MEETING, MeetService, AnnounceService, ScheduleService, ResponsiveService, NotificationService, $rootScope, $state, PubsubService, ScrollService, ActiveDialogService, SweetAlert, NavigationService, ListService, POSTTYPES, EVENTS, TIPSETTING, ngDialog, MEETINGSCHEDULE, DocumentService, UtilityService, NOTIFICATIONTYPE, SeriesService, MultiAuthorService) {
          return {
            templateUrl: 'views/directives/otm/view/meeting/container.html',
            controllerAs: 'container',
            bindToController: true,
            restrict: 'A',
            scope: {
              meeting: '=otmViewMeetingContainer' //meeting.id
            },
            controller: function ($scope) {

              var _this = this;
              _this.isMaxLengthTitle = false;
              _this.editingSchedule = false;

              _this.validateAndPublish = function (isValid, meetingData) {
                if (!MeetService.isMeetingInEditMode()) {
                  if (isValid) {
                    // schedule checks
                    if (!checkScheduleDuration(_this.meeting.schedule)) {
                      flashScheduleMinimumDuration();
                    } else {
                      if (!_this.editingSchedule) {
                        flashConfirmSchedule(_this.meeting.schedule, publish, meetingData);
                      } else {
                        NotificationService.addWarningMessage('OTM.VALIDATION.SCHEDULE-FORM-OPEN');
                      }
                    }
                  } else {
                    if (_this.isMaxLengthTitle) {
                      NotificationService.addWarningMessage('OTM.CONTENT.CREATE.MEETING.VALIDATION.SUBJECT.CHARRESTRICT');
                    } else {
                      NotificationService.addWarningMessage('OTM.VALIDATION.INVALID');
                    }
                  }
                }
              };

              var checkScheduleDuration = function (_schedule) {
                var durationMillis = _schedule.dateClose.getTime() - new Date().getTime();
                return durationMillis > MEETINGSCHEDULE.minimumDurationMillis;
              };

              var flashScheduleMinimumDuration = function () {
                SweetAlert.swal({
                  title: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.SCHEDULED-MIN-DURATION.TITLE'),
                  text: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.SCHEDULED-MIN-DURATION.TEXT', {minDuration: MEETINGSCHEDULE.minimumDurationMillis / 1000 / 60 / 60 + ' hour'}),
                  type: 'warning',
                  confirmButtonText: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.SCHEDULED-MIN-DURATION.EDIT')
                }, function () {
                  _this.setEditingSchedule(true);
                }
                );
              };

              var flashConfirmSchedule = function (_schedule, _callBack, _meetingModel) {
                SweetAlert.swal({
                  html: true,
                  title: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.CONFIRM-SCHEDULE.TITLE'),
                  text: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.CONFIRM-SCHEDULE.TEXT', {dateClose: $filter('amDateFormat')(_schedule.dateClose, 'dddd, MMMM Do YYYY, HH:mm')}),
                  type: 'warning',
                  showCancelButton: true,
                  // confirmButtonColor: '#52CC78',
                  confirmButtonText: $filter('translate')('OTM.WARNINGS.GO-AHEAD'),
                  cancelButtonText: $filter('translate')('OTM.WARNINGS.CANCEL')
                }, function (isConfirmed) {
                  if (isConfirmed) {
                    _callBack(_meetingModel);
                  }
                }
                );
              };

              var publish = function (model) {
                if (!MeetService.isMeetingInEditMode()) {
                  MeetService.publish(model).then(function (meeting) {
                    $timeout(function(){
                      NavigationService.go('root.list.view.meet', {menuitem: 'inbox', dialogId: meeting.id}, {reset: true});
                      ScrollService.scrollToContentTop();
                      NotificationService.addSuccessMessage('OTM.CONTENT.CREATE.MEETING.VALIDATION.CREATED');
                    }, 0 );
                  }, function (error) {
                    if (error.status === 400) {
                      NotificationService.addErrorMessage('OTM.CONTENT.CREATE.MEETING.VALIDATION.NO-LONGER-DRAFT', {
                        duration: NOTIFICATIONTYPE.durationLong,
                        transition: 'root.drafts',
                        transitionName: 'OTM.CONTENT.CREATE.MEETING.VALIDATION.GO-BACK-DRAFTS'
                      });
                    }
                  });
                }
              };


            }
          };
        });
