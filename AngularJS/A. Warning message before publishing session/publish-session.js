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

              _this.currentTip = TIPSETTING.initialStep;
              TipsService.areTipsEnabled(TIPSETTING.draftMeeting).then(function (bool) {
                _this.areDraftTipsEnabled = bool;
              });
              TipsService.areTipsEnabled(TIPSETTING.gettingStarted).then(function (bool) {
                _this.areGettingStartedTipsEnabled = bool;
              });
              // central settings for scheduler directives
              _this.repeatInterval = 'never';
              // init functions
              /*jshint loopfunc: true */
              var init = function (_model) {
                setStart(_model);
                _this.updateProgress();
                SeriesService.isLastInSerie(_this.meeting.id, _this.meeting.serieId).then(function () {
                  _this.isLastInSerie = true;
                }, function () {
                  _this.isLastInSerie = false;
                });

                ActiveDialogService.setActive(_model);

                $('.otm-meeting--start .otm-input-user .tags').resize(function () {
                  $('#informAteam > textarea').height($('.otm-meeting--start .otm-input-user .tags').height());
                });
              };
              //arhives

              _this.accordionX = function ($event) {

                $event.target.nextElementSibling.classList.toggle('active');
                $event.target.nextElementSibling.classList.toggle('show');
                if ($event.target.nextElementSibling.classList.contains('active')) {
                  document.querySelector('#squareCollapse').style.display = 'none';
                } else {
                  document.querySelector('#squareCollapse').style.display = 'inline-block';
                }
              };
              // init editing bools, because these are only visible here, we keep it local, not in a service
              _this.editingStart = false;
              _this.editingSchedule = false;
              _this.editingLists = false;
              _this.editingDocuments = false;
              _this.newListFormVisible = false;
              _this.newActionItemFormVisible = false;
              _this.newDecisionFormVisible = false;
              _this.actionItemSortPredicate = 'dueDate';
              _this.actionItemReverseOrder = false;
              _this.meetingProgress = {};
              var scheduleCarbonCopy = {};
              var startCarbonCopy = {};
              var editingActionItem = {};
              var editingDecision = {};

              // validation bools
              _this.isStartFormValid = true;
              _this.isMaxLengthTitle = false;
              _this.isTitleFormOpen = false;
              _this.serieMeetings = {};
              _this.isInSerie = false;
              _this.isLastInSerie = true;

              // API
              _this.setEditingAll = function (bool) {
                _this.editingStart = bool;
                _this.editingLists = bool;
                // _this.editingDocuments = bool;
                _this.isTitleFormOpen = bool;
                MeetService.validateIfMeetingFormOpen(bool);
              };
              _this.setEditingStart = function (bool) {
                _this.setEditingAll(bool);
                _this.editingStart = bool;
                if (bool) {
                  if (_this.meeting.subject === '"Title"') {
                    _this.meeting.subject = '';
                  }
                }
              };
              _this.validateIfTitleFormIsBeingEdited = function () {
                if (_this.isTitleFormOpen) {
                  return NotificationService.addWarningMessage('OTM.CONTENT.CREATE.NOTIFICATION.ALREADY-OPEN', {
                    scrollTo: _this.meeting.documentId
                  });
                } else {
                  return false;
                }
              };
              _this.delay = function (_delay, _callback, _arg1, _arg2) {
                $timeout(function () {
                  _callback(_arg1, _arg2);
                }, _delay);
              };

              $rootScope.$on('meetingActionItemUpdate', function(event, data){
                angular.forEach(_this.meeting.actionItems, function(a){
                  if(a.id === data.id){
                    a.checked = data.checked;
                  }
                });
                $timeout(function(){
                  _this.updateProgress();
                },0);
              });

              _this.updateProgress = function () {
                var checkedActionItems = 0;
                angular.forEach(_this.meeting.actionItems, function(a){
                  if(a.checked){          checkedActionItems++;             }
                });
                _this.meetingProgress.actionItemsChecked = checkedActionItems;
              };


              // Action items
              _this.setEditingActionItem = function (actionItemId) {
                editingActionItem = {id: actionItemId};
              };
              _this.isEditingActionItem = function (actionItemId) {
                return editingActionItem.id === actionItemId;
              };
              _this.cancelEditingActionItem = function () {
                editingActionItem = {};
              };
              _this.removeActionItem = function (actionItem) {
                _this.meeting.actionItems = _.without(_this.meeting.actionItems, _.find(_this.meeting.actionItems, {id: actionItem.id}));
                _this.updateProgress();
              };

              _this.openOrCloseAllActionItems = function () {
                _this.areAllActionItemsOpened = (_this.areAllActionItemsOpened === true) ? false : true; // Used for the first click, because default state is 'all action items are closed'
                PubsubService.publish(EVENTS.sessionUXEvent.openAllActionItems, [{isOpen: _this.areAllActionItemsOpened}]);
              };

              _this.handleSessionUXEventUnactiveOpenAllActionItemsButtonChannel = PubsubService.subscribe(EVENTS.sessionUXEvent.unactiveOpenAllActionItemsButton, function () {
                _this.areAllActionItemsOpened = false;
              });

              _this.reSortActionItems = function (predicate, reverse) {
                _this.actionItemSortPredicate = predicate;
                _this.actionItemReverseOrder = reverse;
              };
              _this.sortActionItems = function (actionItem) {
                if (_this.actionItemSortPredicate === 'dueDate') {
                  if (!actionItem.dueDate) {
                    return actionItem.dateCreation.getTime() * 2;
                  } else {
                    return actionItem.dueDate.getTime();
                  }
                }
                if (_this.actionItemSortPredicate === 'assignee.fullname') {
                  if (actionItem.assignee && actionItem.assignee.fullname) {
                    return actionItem.assignee.fullname;
                  } else {
                    return 'zzzz';
                  }
                }
              };
              // Decisions
              _this.setEditingDecision = function (decision) {
                editingDecision = {id: decision};
              };
              _this.isEditingDecision = function (decisionId) {
                return editingDecision.id === decisionId;
              };
              _this.cancelEditingDecision = function () {
                editingDecision = {};
              };
              _this.removeDecision = function (decision) {
                _this.meeting.decisions = _.without(_this.meeting.decisions, decision);
              };

              _this.openOrCloseAllDecisionItems = function () {
                _this.areAllDecisionItemsOpened = (_this.areAllDecisionItemsOpened === true) ? false : true; // Used for the first click, because default state is 'all action items are closed'
                PubsubService.publish(EVENTS.sessionUXEvent.openAllDecisionItems, [{isOpen: _this.areAllDecisionItemsOpened}]);
              };

              _this.handleSessionUXEventUnactiveOpenAllDecisionItemsButtonChannel = PubsubService.subscribe(EVENTS.sessionUXEvent.unactiveOpenAllDecisionItemsButton, function () {
                _this.areAllDecisionItemsOpened = false;
              });

              _this.addItemButtonDisable = false;
              _this.openNewAgendaItemForm = function () {
                if(_this.addItemButtonDisable) { return; }
                _this.addItemButtonDisable = true;
                _this.meeting.post('item', {}).then(function (data) {
                  if(data){
                    data.focusActive = true;
                    _this.meeting.agendaItems.push(data);
                    $timeout(function(){
                      ScrollService.scrollToContentElement(data.documentId, {offset: 0});
                    },250);
                    $timeout(function(){
                      _this.addItemButtonDisable = false;
                    },1000);

                  }else{
                    window.console.log(data , ' Error from restangular -> new item object is empty');
                  }
                });
              };

              // Schedule
              _this.setEditingSchedule = function (bool) {
                if (!MeetService.isMeetingInEditMode()) {
                  _this.setEditingAll(false);
                  _this.editingSchedule = bool;
                }
              };
              _this.toggleStartsNow = function (bool) {
                if (!bool) {
                  _this.setEditingSchedule(true);
                }
              };
              // Lists
              _this.setEditingLists = function (bool) {
                _this.editingLists = bool;
              };
              _this.cancelEditingLists = function () {
                _this.editingLists = false;
              };
              _this.showNewListForm = function () {
                _this.setEditingLists(true);
                _this.newListFormVisible = true;
              };
              // Documents
              _this.setEditingDocuments = function (bool) {
                _this.editingDocuments = bool;
              };
              _this.cancelEditingDocuments = function () {
                _this.editingDocuments = false;
              };
              // Replies
//              _this.isCreatingNewReply = function (parentId) {
//                return NewPostService.isFormOpen(parentId, POSTTYPES.reply);
//              };
              _this.getScrollOffset = function () {
                return ScrollService.getScrollOffset();
              };
              _this.disableTips = function () {
                TipsService.disableTips(TIPSETTING.draftMeeting);
              };
              _this.absorbEditedStartAndSave = function (isValid, _meetingModel) {
                if (isValid) {
                  _this.save(_meetingModel).then(function () {
                    _this.setEditingAll(false);
                  });
                } else {
                  if (_meetingModel.subject === '' || _meetingModel.subject === undefined) {
                    if (_this.isMaxLengthTitle) {
                      NotificationService.addWarningMessage('OTM.CONTENT.CREATE.MEETING.VALIDATION.SUBJECT.CHARRESTRICT');
                    } else {
                      NotificationService.addWarningMessage('OTM.CONTENT.CREATE.MEETING.VALIDATION.SUBJECT.MISSING');
                    }
                  } else {
                    NotificationService.addWarningMessage('OTM.CONTENT.CREATE.MEETING.VALIDATION.PARTICIPANTS.INVALIDEMAIL');
                  }
                }
              };
              var checkScheduleDuration = function (_schedule) {
                var durationMillis = _schedule.dateClose.getTime() - new Date().getTime();
                return durationMillis > MEETINGSCHEDULE.minimumDurationMillis;
              };
              _this.absorbEditedScheduleAndSave = function (_editedSchedule) {
                if (_editedSchedule.dateClose) {
                  if (!checkScheduleDuration(_editedSchedule)) {
                    flashScheduleMinimumDuration();
                  } else if (hasScheduleChanged()) {
                    if (_this.isDraft()) {
                      saveSchedule(_editedSchedule);
                    } else {
                      flashWarningAlteringSchedule(saveSchedule, _editedSchedule); // flash notification on closing ongoing meetings
                    }
                  } else {
                    _this.setEditingAll(false);
                    _this.editingSchedule = false;
                    reloadAll();
                  }
                } else if (scheduleCarbonCopy.dateClose) {
                  if (_this.isDraft()) {
                    resetSchedule(_this.meeting); // if draft, just reset the schedule
                  } else {
                    flashWarningCancellingSchedule(cancelRunningSchedule, _this.meeting); // flash notification on closing ongoing meetings
                  }
                } else {
                  _this.setEditingAll(false);
                  _this.editingSchedule = false;
                }
              };
              _this.absorbEditedListsAndSave = function (_lists) {
                angular.forEach(_lists, function (list) {
                  _this.loadingLists = ListService.update(list).then(function (updatedList) {
                    list = updatedList;
                  });
                });
                _this.setEditingLists(false);
              };
              _this.removeList = function (listModel) {
                _this.lists = _.without(_this.lists, _.find(_this.lists, {id: listModel.id}));
              };
              _this.cancelEditingStart = function () {
                if (typeof _this.meeting.subject === 'undefined' || _this.meeting.subject === '') {
                  NotificationService.addWarningMessage('OTM.CONTENT.CREATE.MEETING.VALIDATION.SUBJECT.MISSING');
                }

                _this.reloadStart();
                _this.setEditingAll(false);
                _this.editingSchedule = false;
              };
              _this.cancelEditingSchedule = function (scheduleId) {
                if (scheduleId) {
                  getSchedule(scheduleId);
                }
                _this.editingSchedule = false;
              };
              // loading
              _this.reloadStart = function () {
                $rootScope.$broadcast('reloadMeetingData', {meetingId: _this.meeting.id, updateType: 'meeting'});
                // _this.loadingStart = MeetService.getMeeting(_this.meeting.id).then(function (updatedModel) {
                //   setStart(updatedModel);
                // });
              };


              // CRUD Meeting Start
              _this.save = function(model) {
                _this.savingStart = MeetService.update(model).then(function (updatedModel) {
                  MultiAuthorService.saveChangeInAuthors(updatedModel).then(function(data){
                    _this.meeting.participants = MultiAuthorService.setParticipantAuthors(data);
                    $rootScope.$broadcast('resetAuthorReader');
                    setStart(data);
                    NotificationService.addSuccessMessage('OTM.CONTENT.CREATE.MEETING.NOTIFICATIONS.SAVED');
                  });

                });
                return _this.savingStart;
              };

              _this.saveSilently = function () {
                _this.savingStart = MeetService.update(_this.meeting).then(function (updatedMeeting) {
                  setStart(updatedMeeting);
                });
                return _this.savingStart;
              };
              _this.delete = function (model) {
                if (!MeetService.isMeetingInEditMode()) {
                  MeetService.validateIfMeetingFormOpen(false);
                  flashWarningDeleteMeeting(deleteMeeting, model);
                }
              };
              _this.close = function (model) {
                if (!MeetService.isMeetingInEditMode()) {
                  flashWarningCloseMeeting(model);
                }
              };
              _this.reopen = function (model) {

                var notifyAfterReopen = ngDialog.open({
                  template: 'views/directives/vendor/ngdialog/meeting/notifyafterreopen.html'
                });

                notifyAfterReopen.closePromise.then(function (result) {
                  if (_.isObject(result.value)) {
                    MeetService.reopen(model, result.value.shouldNotify).then(function () {
                      NavigationService.reload();
                      $rootScope.$broadcast('reloadMeetingsData');
                      $rootScope.$broadcast('reloadMeetingData', { meetingId: model.id, updateType: 'meeting' }  );
                    });
                  }
                });
              };
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
              _this.flowFileUploadCompleted = DocumentService.flowFileUploadCompleted;
              _this.handleFlowFileUploadError = DocumentService.handleFlowFileUploadError;
              _this.uploadFiles = DocumentService.uploadFiles;

              var checkMeeting = MeetService.isMeetingInEditMode();
              if (checkMeeting) {
                return checkMeeting;
              }

              _this.shouldScheduleBeVisible = function (_meetingModel) {
                return !_meetingModel.draft && _meetingModel.schedule;
              };
              _this.toggleSideBar = function (bool) {
                ResponsiveService.toggleSideBar(bool);
              };
              _this.isTourActive = function () {
                return TipsService.isTourActive();
              };

              _this.openUploadModal = function () {
                var closeUploadModal = ngDialog.open({
                  template: 'components/upload_modal/uploadmodal.html',
                  controller: 'UploadModalCtrl',
                  controllerAs: 'vm'

                });
                closeUploadModal.closePromise.then(function (result) {
                  if (_.isObject(result.value)) {
                    //closeMeeting(_meetingModel, result.value.shouldNotify);
                    // TODO actualize meeting documents?
                  }
                });
              };
              // LOCAL FUNCTIONS
              var deleteMeeting = function (meetingModel) {
                MeetService.delete(meetingModel).then(function () {
                  $state.go('root.drafts', {}, {reload: true});
                });
              };
              var closeMeeting = function (meetingModel, shouldNotify) {
                MeetService.cancel(meetingModel, shouldNotify).then(function () {
                  $rootScope.$broadcast('reloadMeetingsData');
                  $rootScope.$broadcast('reloadMeetingData', {meetingId: meetingModel.id, updateType: 'meeting'} );
                  ScrollService.scrollToContentTop();

                });
              };
              var setSchedule = function (scheduleModel) {
                _this.meeting.schedule = scheduleModel;
                scheduleCarbonCopy = angular.copy(_this.meeting.schedule);
              };
              var setStart = function () {
                startCarbonCopy = angular.copy(_this.meeting);
                if (_this.meeting.schedule) {
                  getSchedule(_this.meeting.schedule.id);
                }
              };
              var hasScheduleChanged = function () {
                if (_.isEmpty(scheduleCarbonCopy)) {
                  return true;
                } else {
                  return !angular.equals(scheduleCarbonCopy, _this.meeting.schedule);
                }
              };
              var publish = function (model) {
                if (!MeetService.isMeetingInEditMode()) {
                  MeetService.publish(model).then(function (meeting) {
                    // $rootScope.$broadcast('reloadMeetingData', {meetingId: meeting.id, updateType: 'meeting'} );
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

              var flashWarningAlteringSchedule = function (_callBack, _scheduleModel) {
                SweetAlert.swal({
                  html: true,
                  title: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.ALTER-SCHEDULE.TITLE'),
                  text: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.ALTER-SCHEDULE.TEXT', {dateClose: $filter('amDateFormat')(_scheduleModel.dateClose, 'dddd, MMMM Do YYYY, HH:mm')}),
                  type: 'warning',
                  showCancelButton: true,
                  // confirmButtonColor: '#52CC78',
                  confirmButtonText: $filter('translate')('OTM.WARNINGS.GO-AHEAD')
                }, function (isConfirmed) {
                  if (isConfirmed) {
                    _callBack(_scheduleModel);
                  }
                }
                );
              };
              var flashWarningCancellingSchedule = function (_callBack, _scheduleModel) {
                SweetAlert.swal({
                  title: $filter('translate')('OTM.WARNINGS.ARE-YOU-SURE'),
                  text: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.CANCEL-SCHEDULE.TEXT'),
                  type: 'warning',
                  showCancelButton: true,
                  // confirmButtonColor: '#52CC78',
                  confirmButtonText: $filter('translate')('OTM.WARNINGS.GO-AHEAD')
                }, function (isConfirmed) {
                  if (isConfirmed) {
                    _callBack(_scheduleModel);
                  }
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
              var flashWarningDeleteMeeting = function (_callBack, _meetingModel) {
                SweetAlert.swal({
                  title: $filter('translate')('OTM.WARNINGS.ARE-YOU-SURE'),
                  text: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.DELETE-DRAFT.TEXT'),
                  type: 'warning',
                  showCancelButton: true,
                  // confirmButtonColor: '#52CC78',
                  confirmButtonText: $filter('translate')('OTM.CONTENT.CREATE.MEETING.WARNINGS.DELETE-DRAFT.OK')
                }, function (isConfirmed) {
                  if (isConfirmed) {
                    _callBack(_meetingModel);
                  }
                }
                );
              };
              var flashWarningCloseMeeting = function (_meetingModel) {
                var closeMeetingDialog = ngDialog.open({
                  template: 'views/directives/vendor/ngdialog/meeting/close.html'
                });
                closeMeetingDialog.closePromise.then(function (result) {
                  if (_.isObject(result.value)) {
                    closeMeeting(_meetingModel, result.value.shouldNotify);
                  }
                });
              };
              _this.isDraft = function () {
                return _this.meeting && _this.meeting.draft;
              };
              _this.wasCancelled = function () {
                return _this.meeting && _this.meeting.scheduleExecution && _this.meeting.scheduleExecution.dateCancelled;
              };
              var saveSchedule = function (scheduleModel) {
                ScheduleService.update(scheduleModel).then(function (updatedSchedule) {
                  setSchedule(updatedSchedule);
                  _this.setEditingAll(false);
                  _this.editingSchedule = false;
                  reloadAll();
                  NotificationService.addSuccessMessage('OTM.CONTENT.CREATE.MEETING.SCHEDULE.SAVED');
                });
                return _this.loadingSchedule;
              };
              var cancelRunningSchedule = function (_meetingModel) {
                _this.loadingSchedule = MeetService.cancelRunningSchedule(_meetingModel).then(function () {
                  _this.setEditingAll(false);
                  _this.editingSchedule = false;
                  reloadAll();
                  NotificationService.addSuccessMessage('OTM.CONTENT.CREATE.MEETING.SCHEDULE.DISABLED');
                });
                return _this.loadingSchedule;
              };
              var resetSchedule = function (_meetingModel) {
                _this.loadingSchedule = MeetService.resetSchedule(_meetingModel).then(function () {
                  reloadAll();
                  _this.setEditingAll(false);
                  _this.editingSchedule = false;
                  NotificationService.addSuccessMessage('OTM.CONTENT.CREATE.MEETING.SCHEDULE.DISABLED');
                });
                return _this.loadingSchedule;
              };
              var addActionItem = function (newActionItem) {
                _this.meeting.actionItems.push(newActionItem);
              };
              var addDecision = function (newDecision) {
                _this.meeting.decisions.push(newDecision);
              };
              var addList = function (newList) {
                _this.lists.push(newList);
              };
              var loadLists = function (currentMeeting) {
                _this.lists = [];
                angular.forEach(currentMeeting.checklists, function (checklist) {
                  _this.loadingLists = ListService.get(checklist.id).then(function (list) {
                    _this.lists.push(list);
                  });
                });
              };
              var getSchedule = function (scheduleId) {
                _this.loadingSchedule = ScheduleService.get(scheduleId).then(function (schedule) {
                  setSchedule(schedule);
                }, function (error) {
                  $log.debug(error);
                });
              };
              var reloadAll = function () {
                init(_this.meeting);
                // if (_this.meeting.schedule) {
                //   getSchedule(_this.meeting.schedule.id);
                // }
                _this.agendaItems = _this.meeting.agendaItems;
                //                  loadAgendaItems(refreshedMeeting);
                loadLists(_this.meeting);

              };

              var addUploadedDocument = function (_document) {
                _this.meeting.uploadedDocuments.push(_document);
              };

              // Alex: this method is called after the DB query (for every item)
              // So we just have to change the position with the position returned from the DB
              var updateAgendatItemsPosition = function (currentItem) {
                var ai = _.find(_this.agendaItems, {id: currentItem.id});
                ai.position = currentItem.position;
                _this.agendaItems = UtilityService.refreshAgendaItemPositionsAfterRemoving(_this.agendaItems, true);
              };

              var updateAgendaItem = function (updatedAgendaItem) {
                _.extend(_.find(_this.agendaItems, {id: updatedAgendaItem.id}), updatedAgendaItem);
              };

              var subscribedToEvents = false;
              var subscribeToEvents = function(){
                _this.listHandle = PubsubService.subscribe('/list/added/to/dialog/' + _this.meeting.id, addList);
                _this.actionItemHandle = PubsubService.subscribe('/actionitem/added/to/dialog/' + _this.meeting.id, addActionItem);
                _this.decisionHandle = PubsubService.subscribe('/decision/added/to/dialog/' + _this.meeting.id, addDecision);
                _this.uploadedDocumentHandle = PubsubService.subscribe('/upload/added/to/meeting/' + _this.meeting.id, addUploadedDocument);
                // _this.removedDocumentHandle = PubsubService.subscribe('/upload/removed/from/meeting/' + _this.meeting.id, removeUploadedDocument);
                _this.updatePositionsHandle = PubsubService.subscribe('/agendaitem/updated/position/' + _this.meeting.id, updateAgendatItemsPosition);
                _this.updateAgendaItemHandle = PubsubService.subscribe('/agendaitem/updated/' + _this.meeting.id, updateAgendaItem);
                subscribedToEvents = true;
              };

              // PUBSUB, EVENTS and WATCHES
              $scope.$on('$destroy', function () {
                if(subscribedToEvents){
                  PubsubService.unSubscribe(_this.listHandle);
                  PubsubService.unSubscribe(_this.actionItemHandle);
                  PubsubService.unSubscribe(_this.decisionHandle);
                  PubsubService.unSubscribe(_this.uploadedDocumentHandle);
                  // PubsubService.unSubscribe(_this.removedDocumentHandle);
                  PubsubService.unSubscribe(_this.updatePositionsHandle);
                  PubsubService.unSubscribe(_this.updateAgendaItemHandle);
                }
                subscribedToEvents = false;
                PubsubService.unSubscribe(_this.handleSessionUXEventUnactiveOpenAllActionItemsButtonChannel);
              });

              $rootScope.$on(EVENTS.navigation.publish, function (_event, _draftId) {
                if (_this.meeting && (_this.meeting.id.toString() === _draftId.toString())) {
                  _this.validateAndPublish(_this.isStartFormValid, _this.meeting);
                }
              });

              $rootScope.$on(EVENTS.navigation.refreshAllContent, function () {
                reloadAll();
              });

              // load this meeting
              $scope.$watch('container.meeting', function(_meeting){
                if(_meeting){
                  _this.meeting = _meeting;
                  subscribeToEvents();
                  reloadAll();
                }
              });

              _this.getTimeFromNow = function (someDate) {
                return moment(someDate).fromNow(true);
              };
              _this.hasDueDatePassed = function (someDate) {
                return moment(someDate).isBefore(new Date());
              };

              var seriesGoToState = function(){
                var stateToGo = null;
                if($state.params.menuitem){
                  stateToGo = $state.params.menuitem.includes('team') ? 'teams' : 'inbox';
                }else{
                  stateToGo = 'inbox';
                }
                return stateToGo;
              };

              _this.goNextInSerie = function () {
                SeriesService.getNextInSerie(_this.meeting.id, _this.meeting.serieId).then(function (nextMeeting) {
                  NavigationService.go('root.list.view.meet', {menuitem: seriesGoToState() , dialogId: nextMeeting.id}, {reset: true});
                  ScrollService.scrollToContentTop();
                });
              };

              _this.goPreviousInSerie = function () {
                SeriesService.getPreviousInSerie(_this.meeting.id, _this.meeting.serieId).then(function (previousMeeting) {
                  NavigationService.go('root.list.view.meet', { menuitem: seriesGoToState(), dialogId: previousMeeting.id}, {reset: true});
                  ScrollService.scrollToContentTop();
                });
              };

              _this.exportPDF = function () {
                _this.loadingStart = createPDF();
              };

              function createPDF() {

                var html = $('#otm-meeting--top').html() +
                        '<link rel="stylesheet" type="text/css" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">';

                var css = '<style>' +
                        '@import url("https://fonts.googleapis.com/css?family=Work+Sans:300,400,500,600,700");' +
                        '.otm-meeting--comment {page-break-inside: avoid;}' +
                        '.yabbu-comment-body-content {min-height: 20px;}' +
                        '.otm-meeting--comment ol.otm-files-uploaded-form, .otm-meeting--reply ol.otm-files-uploaded-form, .otm-new-reply ol.otm-files-uploaded-form {list-style-type: none;width: 100%; margin: 0;padding: 0;overflow: hidden;overflow-wrap: normal;border: 1px solid #f2f2f2;border-radius: 3px;margin-bottom: 15px;margin-top: 15px;}' +
                        '.otm-meeting--comment ol.otm-files-uploaded-form li, .otm-meeting--reply ol.otm-files-uploaded-form li, .otm-new-reply ol.otm-files-uploaded-form li {width: 100%;text-align: left;overflow: visible;}' +
                        '.otm-meeting--comment ol.otm-files-uploaded-form li a, .otm-meeting--comment ol.otm-files-uploaded-form li span.editing, .otm-meeting--reply ol.otm-files-uploaded-form li a, .otm-meeting--reply ol.otm-files-uploaded-form li span.editing, .otm-new-reply ol.otm-files-uploaded-form li a, .otm-new-reply ol.otm-files-uploaded-form li span.editing {padding: 5px 15px;padding-right: 6px;width: 100%;text-decoration: none;display: block;position: relative;}' +
                        '.otm-meeting--comment ol.otm-files-uploaded-form li a span.document-name, .otm-meeting--comment ol.otm-files-uploaded-form li span.editing span.document-name, .otm-meeting--reply ol.otm-files-uploaded-form li a span.document-name, .otm-meeting--reply ol.otm-files-uploaded-form li span.editing span.document-name, .otm-new-reply ol.otm-files-uploaded-form li a span.document-name, .otm-new-reply ol.otm-files-uploaded-form li span.editing span.document-name {font-weight: 600;display: inline-block;overflow: hidden;white-space: nowrap;text-overflow: ellipsis; width: 60%;}' +
                        '.otm-meeting--start ol.otm-files-uploaded-form li a span:not(:last-child), .otm-meeting--start ol.otm-files-uploaded-form li span.editing span:not(:last-child) {margin-right: 17px;}' +
                        '.otm-meeting--start ol.otm-files-uploaded-form li a span.document-name, .otm-meeting--start ol.otm-files-uploaded-form li span.editing span.document-name {font-weight: 600;display: inline-block;overflow: hidden;width: 59%;white-space: nowrap;text-overflow: ellipsis;}' +
                        '.otm-meeting--comment .yabbu-comment-header {background: #EFEFEF; min-height: 50px; padding-top: 5px; padding-left: 20px; page-break-inside: avoid;}' +
                        '.otm-meeting--comment .yabbu-comment-header .yabbu-comment-title {display: table;width: 100%;}' +
                        '.otm-meeting--comment .yabbu-comment-header .yabbu-comment-title .position {margin-right: 10px;}' +
                        '.otm-meeting--comment .yabbu-comment-header .yabbu-comment-title .text {display: table-cell;width: 100%;}' +
                        '.otm-meeting--comment .yabbu-comment-body .yabbu-comment-author {height: 30px;}' +
                        '.otm-meeting--comment .yabbu-comment-body {padding: 20px;padding-bottom: 0;min-height: 100px;}' +
                        '.otm-meeting--comment .yabbu-comment-body .yabbu-comment-author .yabbu-comment-author-date span, .otm-meeting--reply .yabbu-reply-author-date span, .yabbu-closed-ai .yabbu-closed-ai-author-date span {color: #707c80; font-weight:200;}' +
                        '.otm-header-timestamp.edited span:nth-child(1) {display:none!important;}' +
                        '.otm-header-timestamp.edited span:nth-child(2) {display:block!important;}' +
                        '.otm-meeting--reply.otm-content-wrapper > div {padding: 15px 20px !important;}' +
                        '.otm-meeting--reply .yabbu-reply-body .yabbu-reply-body-content {padding-left: 80px;}' +
                        '.otm-meeting--reply .yabbu-reply-author-date {display:block; text-align: right; color: #707c80; margin-bottom: 10px;}' +
                        '.otm-action-item-list, .otm-decision-list {margin-bottom: 10px;}' +
                        '.otm-action-item-list .line-one input {display:none;}' +
                        '.otm-meeting--start ol.otm-files-uploaded-form {list-style-type: none;width: 100%;margin: 0;padding: 0;overflow: hidden;overflow-wrap: normal;border: 1px solid #f2f2f2;border-radius: 3px;margin-bottom: 15px;margin-top: 15px;}' +
                        '.otm-meeting--start ol.otm-files-uploaded-form li a, .otm-meeting--start ol.otm-files-uploaded-form li span.editing {padding: 5px 15px;padding-right: 6px;width: 100%;text-decoration: none;display: block;position: relative;}' +
                        '.otm-meeting--reply .yabbu-reply-body {padding: 0px;padding-top: 10px;padding-bottom: 5px;min-height: 60px;}' +
                        '.otm-meeting--comment {border: 1px solid #DDD;position: relative; margin-top: 20px;border-left: 5px solid #DDD;-webkit-transition: border-left 0.3s ease-in-out;transition: border-left 0.3s ease-in-out;}' +
                        '.otm-conversation-user-profile .otm-profile-info .otm-profile-role, .otm-team-screen .otm-team-members .otm-team-card .otm-team-card-new--form .otm-profile-info .otm-profile-role {font-size: 75%;font-weight: 300;color: #707c80;margin-top: 0;}' +
                        '.otm-actions-decisions-container {min-height: 50px;position: relative;padding: 15px 15px 50px;}' +
                        '.yabbu-closed-ai .yabbu-closed-ai-author-date {display: block;text-align: right;}' +
                        '.yabbu-closed-ai .otm-conversation-text {padding-left: 80px;}' +
                        '.otm-content-wrapper > div {padding: 15px 20px;}' +
                        '.otm-action-item-list .line-one .column-right.textual span.task-name, .otm-decision-list .line-one .column-right.textual span.task-name {font-weight: 600;}' +
                        '.otm-agenda-item-title-container {margin-top: 20px;padding-top: 5px;padding-bottom: 5px;padding-right: 15px;padding-left: 15px;}' +
                        '.otm-scheduler-container {width: 100%;min-height: 50px;border-top: 1px solid #eff0f1;display: inline-block;}' +
                        '.otm-meeting--start .options-container {border-bottom: 1px solid #eff0f1;}' +
                        '.otm-meeting--start .otm-conversation-title {font-weight: 500;display: block;width: 100%;height: 1.5em;padding-bottom: 10px;border-bottom: 1px solid #eff0f1;}' +
                        '.otm-conversation-user-profile .otm-profile-photo, .otm-team-screen .otm-team-members .otm-team-card .otm-team-card-new--form .otm-profile-photo {float: left;}' +
                        '.otm-conversation-user-profile .otm-profile-photo img, .otm-team-screen .otm-team-members .otm-team-card .otm-team-card-new--form .otm-profile-photo img {width: 60px;}' +
                        '.otm-meeting--reply {margin-top: -1px;border: 1px solid #DDD;border-left: 25px solid #DDD;position: relative;}' +
                        '.otm-action-item-list.otm-list-task--checked span, .otm-list-task--checked.otm-decision-list span {text-decoration: line-through;}' +
                        '.otm-conversation-user-profile .otm-profile-photo, .otm-team-screen .otm-team-members .otm-team-card .otm-team-card-new--form .otm-profile-photo {display: block;margin: 0 auto;width: 60px;overflow: hidden;float: left;border-radius: 50%;}' +
                        '.otm-conversation-header-info .otm-conversation-recipients .text, .otm-conversation-header-info .otm-conversation-teams .text, .otm-conversation-header-info .otm-conversation-tags .text {margin: 10px 0;text-transform: uppercase;margin-top: auto;width: 105px;text-align: right;}' +
                        '.otm-conversation-user-profile .otm-profile-info, .otm-team-screen .otm-team-members .otm-team-card .otm-team-card-new--form .otm-profile-info {display: inline-block;margin-left: 20px;}' +
                        '.otm-meeting--comment .yabbu-comment-body .yabbu-comment-author .yabbu-comment-author-date {position: absolute;right: 20px;;top: 87px;}' +
                        '.otm-meeting--comment .yabbu-comment-body .yabbu-comment-body-content {padding-left: 80px;}' +
                        '.otm-content-title .fa-th-list {margin-right: 10px;}' +
                        '.otm-list-task--checked::before {content: "\\f046"; float: left; display: inline-block;font: normal normal normal 14px/1 FontAwesome;font-size: inherit; text-rendering: auto; -webkit-font-smoothing: antialiased; margin-right: 8px;}' +
                        'h4 {font-size: 25px;line-height: 150%;font-weight: 600;margin: 10px 0;color: #333333;}' +
                        'h5 {font-size: 20px;line-height: 150%;font-weight: 600;margin: 10px 0;color: #373d3f;}' +
                        'h3, .otm-meeting--start .otm-conversation-title, .otm-meeting--start .otm-conversation-title-input {font-weight: 600; font-size: 30px;}' +
                        '#otm-side-bar-logo-img {position: absolute; top: 20px; right: 20px;}' +
                        '#agenda-holder {padding: 0px !important;}' +
                        '.pdf-rendering {display: initial;} .pdf-rendering-hidden {display:none!important}' +
                        '.otm-comment-container li {list-style: inherit;}' +
                        '.yabbu-closed-ai .yabbu-closed-ai-icon {font-size: 2em;}' +
                        '.otm-meeting--reply .yabbu-reply-footer .yabbu-reply-likes .yabbu-reply-likes-thumb {float: left;width: 4%;}' +
                        '.otm-meeting--comment .yabbu-comment-footer .yabbu-comment-likes .yabbu-comment-thumb {float: left;width: 3%;-webkit-align-content: center;-ms-flex-line-pack: center;align-content: center;}' +
                        '.otm-meeting--comment .yabbu-comment-footer .yabbu-comment-likes {width: 50%;margin-top: 10px;margin-bottom: 8px;margin-left: 15px;}' +
                        '.otm-meeting--reply .yabbu-reply-footer .yabbu-reply-likes .yabbu-reply-likes-names ul {list-style-type: none; padding-left: .7em;margin: 0;}' +
                        '.otm-meeting--reply .yabbu-reply-footer .yabbu-reply-likes .yabbu-reply-likes-names ul li, .otm-meeting--comment .yabbu-comment-footer .yabbu-comment-likes ul li {display: inline; list-style: none;}' +
                        '*, *:before, *:after {-moz-box-sizing: border-box; box-sizing: border-box;} html {zoom: 0.55;} html, body {border:0; background: #FFFFFF; font-family: "Work Sans", sans-serif;} body {margin:0; padding:2px; background: #FFF; font-family: "source-sans-pro", "HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;} .my-class, .y-edit-section-buttons, .otm-meeting-list-sort, .fa-user, .fa-clock-o, .fa-calendar-o, .controls, .otm-meeting--serie, .yabbu-export-btn, .ng-hide, .yabbu-reply-author-date-mobile, button, #otm-meeting-form-attachments-button, span.assignee, .yabbu-closed-ai-author-date-mobile {display:none;} li{list-style: none} a {color: black; text-decoration: none;} .otm-conversation-title{font-size: 30px;line-height: 150%;font-weight: 600;margin: 10px 0;color: #333333; display: block;}' +
                        '</style>';

                // Replace relative URLs by absolute URLs (used for the default profile picture)
                var baseUrl = $location.$$protocol + '://' + $location.$$host + ':' + $location.$$port;
                html = html.replace(/\/assets\//g, baseUrl + '/assets/');

                var pdfName = moment(_this.meeting.schedule.dateClose).format('YYYYMMDD') + '_' + _this.meeting.subject.replace(/\s+/g, '_') + '.pdf';

                var htmlDoc = {
                  name: pdfName,
                  html: window.escape(html + css)
                };

                var req = {
                  method: 'POST',
                  url: _config.yabbuPdfGenerator.url,
                  header: {'Content-Type': 'application/json'},
                  responseType: 'arraybuffer',
                  data: {document: JSON.stringify(htmlDoc)}
                };

                $http(req).then(function (res) {

                  var ie = navigator.userAgent.match(/MSIE\s([\d.]+)/),
                          ie11 = navigator.userAgent.match(/Trident\/7.0/) && navigator.userAgent.match(/rv:11/),
                          ieEDGE = navigator.userAgent.match(/Edge/g),
                          ieVer = (ie ? ie[1] : (ie11 ? 11 : (ieEDGE ? 12 : -1)));

                  if (ie && ieVer < 10) {
                    SweetAlert.swal({
                      title: 'Your PDF',
                      text: 'Your browser is too old to generate the PDF. Please update your browser or just leave Internet Explorer to have a better experience!',
                      type: 'warning',
                      showCancelButton: false,
                      confirmButtonColor: '#DD6B55',
                      confirmButtonText: $filter('translate')('OTM.WARNINGS.GO-AHEAD')
                    }, function () {
                      $log.log('User clicked the button');
                    }
                    );
                    return;
                  }

                  var pdfAsBlob = new Blob([res.data], {
                    type: 'application/pdf'
                  });

                  if (ieVer > -1) {
                    window.navigator.msSaveBlob(pdfAsBlob, pdfName);
                  } else {
                    var downloadLink = document.createElement('a');
                    downloadLink.download = pdfName;
                    downloadLink.href = window.URL.createObjectURL(pdfAsBlob);
                    downloadLink.onclick = function (e) {
                      document.body.removeChild(e.target);
                    };
                    downloadLink.style.display = 'none';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                  }
                }, function (err) {
                  $log.log(err);
                });
              }

              _this.showAllActionItems = function () {
                _this.loadingStart = SeriesService.getAllInSerie(_this.meeting.id, _this.meeting.serieId).then(function (_meetings) {
                  _this.serieMeetings = _meetings;
                  _this.isInSerie = _meetings.length > 1;
                  var last = _.max(_meetings, function (meeting) {
                    return meeting.seriePosition;
                  });

                  _this.isLastInSerie = _this.meeting.seriePosition === last.seriePosition;
                  for (var i = 0; i < _this.serieMeetings.length; i++) {
                    _this.serieMeetings[i].onlyCopiedActionItems = _.every(_this.serieMeetings[i].actionItems, function (ai) {
                      return ai.copied;
                    });
                  }

                  ngDialog.openConfirm({
                    template: 'views/directives/vendor/ngdialog/meeting/showAllActionItems.html',
                    // controllerAs: 'container',
                    data: {
                      title: 'All tasks in series',
                      meetings: _this.serieMeetings
                    }
                  });
                });
              };

              _this.showAllDecisions = function () {
                _this.loadingStart = SeriesService.getAllInSerie(_this.meeting.id, _this.meeting.serieId).then(function (_meetings) {
                  _this.serieMeetings = _meetings;
                  _this.isInSerie = _meetings.length > 1;
                  var last = _.max(_meetings, function (meeting) {
                    return meeting.seriePosition;
                  });
                  _this.isLastInSerie = _this.meeting.seriePosition === last.seriePosition;

                  ngDialog.openConfirm({
                    template: 'views/directives/vendor/ngdialog/meeting/showAllDecisions.html',
                    // controllerAs: 'container',
                    data: {
                      title: 'All decisions in series',
                      meetings: _this.serieMeetings
                    }
                  });
                });
              };
            }
          };
        });
