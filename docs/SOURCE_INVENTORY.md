# Source inventory for the consolidation plan

This inventory supports [CONSOLIDATION_PLAN.md](CONSOLIDATION_PLAN.md). It records static discovery at the pinned develop baselines, not a completed production-parity audit. Counts refer to graph Class/Function/Method symbols, including lifecycle/declaration symbols; they are not feature counts. Representative names are navigation aids, not the complete set of branches to port.

## Baselines

- UA: `dfbd13e8504f1e2153a4c4ddaa775679f844092c`, fetched `origin/develop`, source root `/Users/tlf/EF/unified-agent`.
- UAD: `ee72cc3fb531576638f25caf745a9e67f3e02694`, fetched `origin/develop`, source root `/Users/tlf/EF/unified-admin`.
- VRS: `dcaf1c6328592ab9fbca8055a0230e764d4101f7`, fetched `origin/develop`. Original repository `/Users/tlf/EF/VRS/front-end`; reviewed archive `/tmp/agent-desk2-plan-vrs-develop`. Its local develop checkout is older.
- AD2: current working tree based on `a8c88ba214ab579d02c502c6cf315c336fd2c5c7`; existing user edits remain unmodified by this planning task.

Reproduce exact source reads with `git show <baseline>:<path>` in the corresponding repository. UAD paths include `Frontend/` or `Backend/`. VRS paths below are relative to its `front-end` repository.

## Unified Agent executable surfaces

123 non-test implementation files with discovered executable/class symbols are listed below. Associated templates, styles, permission pipes, models, configuration and assets must be inspected alongside these files during the atomic parity audit.

| Source path                                                                                                             | Target area                   | Symbols | Representative source symbols                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/announcement/agent-announcements/agent-announcements.component.ts`                                             | Announcements                 | 6       | `AgentAnnouncementsComponent`, `onScrollDown`, `onUnreadClick`, `sortList`                                                                                                          |
| `src/app/announcement/announcement.component.ts`                                                                        | Announcements                 | 9       | `AnnouncementComponent`, `confirmDelete`, `confirmationDialog`, `getAllAnnouncements`, `onNewAnnouncement`, `onPageChange`                                                          |
| `src/app/app-header/app-header.component.ts`                                                                            | Shell / Preferences           | 83      | `AppHeaderComponent`, `addPartialSearchOnEntries`, `allowedHomePages`, `areMRDStatesNotReady`, `canViewDashboardPermissionForAgent`, `canViewDashboardPermissionForSupervisor`      |
| `src/app/app-routing.module.ts`                                                                                         | Shared platform / integration | 2       | `AppRoutingModule`, `loadChildren`                                                                                                                                                  |
| `src/app/app.component.ts`                                                                                              | Shared platform / integration | 9       | `AppComponent`, `checkCompactView`, `handleNgOnInitScenarios`, `retryConfigLoad`, `switchLanguage`, `switchTheme`                                                                   |
| `src/app/app.module.ts`                                                                                                 | Shared platform / integration | 4       | `AppModule`, `HttpLoaderFactory`, `appBootstrapFactory`, `createApollo`                                                                                                             |
| `src/app/auth.guard.ts`                                                                                                 | Identity / Session            | 7       | `AuthGuard`, `canActivate`, `checkRouteAccess`, `checkScope`, `handlePermissionIfCCUserExists`, `handleSupervisorPath`                                                              |
| `src/app/back-to-login.guard.ts`                                                                                        | Identity / Session            | 3       | `BackToLogInGuard`, `canActivate`                                                                                                                                                   |
| `src/app/change-password-dialog/change-password-dialog.component.ts`                                                    | Identity / Session            | 18      | `ChangePasswordDialogComponent`, `cancel`, `checkRule`, `evaluatePassword`, `f`, `fetchPolicies`                                                                                    |
| `src/app/chat-features/chat-routing.module.ts`                                                                          | Workspace                     | 1       | `ChatRoutingModule`                                                                                                                                                                 |
| `src/app/chat-features/chat.module.ts`                                                                                  | Workspace                     | 1       | `ChatModule`                                                                                                                                                                        |
| `src/app/chat-features/chats/chats.component.ts`                                                                        | Workspace                     | 12      | `ChatsComponent`, `getConversationDisplay`, `getInitials`, `getLastMessage`, `getTabIndexFromConversationId`, `switchTab`                                                           |
| `src/app/chat-features/contact-card/contact-card.component.ts`                                                          | Workspace                     | 24      | `ContactCardComponent`, `copyToClipboard`, `formatLabel`, `getActionLabel`, `getActionType`, `getCustomerByVoiceIdentifier`                                                         |
| `src/app/chat-features/customer-info/customer-info.component.ts`                                                        | Workspace                     | 31      | `CustomerInfoComponent`, `callStartTime`, `close`, `copyContent`, `customerInfoToggle`, `displayAllDetails`                                                                         |
| `src/app/chat-features/interactions/chat-messages/button-message/button-message.component.ts`                           | Workspace                     | 2       | `ButtonMessageComponent`                                                                                                                                                            |
| `src/app/chat-features/interactions/chat-messages/chat-messages.component.ts`                                           | Workspace                     | 31      | `ChatMessagesComponent`, `applyLocale`, `buildCalendarStrings`, `canEditMessage`, `filePreviewOpener`, `getChatMessageContentClasses`                                               |
| `src/app/chat-features/interactions/chat-messages/comment-message/comment-message.component.ts`                         | Workspace                     | 17      | `CommentMessageComponent`, `changeCommentIdAction`, `changeFullPostViewAction`, `changeOriginalMessageIdAction`, `changePrivateMessageReplyAction`, `changeSelectedCommentIdAction` |
| `src/app/chat-features/interactions/chat-messages/conversation-data-message/conversation-data-message.component.ts`     | Workspace                     | 3       | `ConversationDataMessageComponent`                                                                                                                                                  |
| `src/app/chat-features/interactions/chat-messages/email-activity/email-activity.component.ts`                           | Workspace                     | 15      | `EmailActivityComponent`, `constructOutlookEmailBody`, `createEmailThreadList`, `emailBodyContentIndentation`, `forwardEmail`, `getEmailSignature`                                  |
| `src/app/chat-features/interactions/chat-messages/plain-message/plain-message.component.ts`                             | Workspace                     | 2       | `PlainMessageComponent`                                                                                                                                                             |
| `src/app/chat-features/interactions/chat-messages/scheduled-activity-message/scheduled-activity-message.component.ts`   | Workspace                     | 2       | `ScheduledActivityMessageComponent`                                                                                                                                                 |
| `src/app/chat-features/interactions/chat-messages/system-notification-message/system-notification-message.component.ts` | Workspace                     | 2       | `SystemNotificationMessageComponent`                                                                                                                                                |
| `src/app/chat-features/interactions/chat-messages/voice-activity-message/voice-activity-message.component.ts`           | Workspace                     | 7       | `VoiceActivityMessageComponent`, `checkAgentInActivity`, `handleAudioError`, `isString`, `playSelectedAudio`, `toggleAudioPlayback`                                                 |
| `src/app/chat-features/interactions/chat-messages/voicemail-activity-message/voicemail-activity-message.component.ts`   | Voicemail / Workspace         | 4       | `VoicemailActivityMessageComponent`, `playSelectedAudio`, `toggleAudioPlayback`                                                                                                     |
| `src/app/chat-features/interactions/interactions.component.ts`                                                          | Workspace                     | 223     | `BargeIn`, `InteractionsComponent`, `addLLMSuggestion`, `adjustHeightOnComposerResize`, `adjustScrollPosition`, `agentAssistanceRequest`                                            |
| `src/app/chat-features/interactions/profile-picture/profile-picture.component.ts`                                       | Workspace                     | 11      | `ProfilePictureComponent`, `channelLogo$`, `hasSchedulingMetaData`, `isOutboundCall`, `isVoice`, `isWrapup`                                                                         |
| `src/app/chat-features/manual-outbound-call/manual-outbound-call.component.ts`                                          | Customers / Outbound          | 15      | `ManualOutboundCallComponent`, `applyPrefix`, `applyPrefixOnNumber`, `convertZerosToPlus`, `formatePhoneNumber`, `getCustomerByVoiceIdentifier`                                     |
| `src/app/chat-features/send-sms/send-sms.component.ts`                                                                  | Customers / Outbound          | 26      | `SendSmsComponent`, `SendSmsSnackbarComponent`, `applyPrefix`, `applyPrefixOnNumber`, `convertZerosToPlus`, `dismiss`                                                               |
| `src/app/chat-features/wrap-up-form/wrap-up-form.component.ts`                                                          | Workspace                     | 35      | `WrapUpFormComponent`, `appendCategories`, `calculateDynamicLimit`, `categoryKey`, `closeDialog`, `collectCategoriesToAppend`                                                       |
| `src/app/column-preferences/column-preferences.component.ts`                                                            | Customers                     | 14      | `ColumnPreferences`, `addPreference`, `checkForSchemaConsistency`, `createPreference`, `drop`, `editPreference`                                                                     |
| `src/app/create-customer/create-customer.component.ts`                                                                  | Customers                     | 25      | `CreateCustomerComponent`, `OnItemDeSelect`, `addFormControls`, `addFormValidations`, `convertArrayToObject`, `createCustomer`                                                      |
| `src/app/customer-actions/customer-actions.component.ts`                                                                | Customers                     | 30      | `CustomerActionsComponent`, `OnItemDeSelect`, `addFormControls`, `addFormValidations`, `checkType`, `convertArrayToObject`                                                          |
| `src/app/customer-schema/create-attribute/create-attribute.component.ts`                                                | Customers                     | 13      | `CreateAttributeComponent`, `ValidateNameDuplication`, `camelize`, `createNewAttribute`, `getAttributeTypes`, `onChannelIdentifierChange`                                           |
| `src/app/customer-schema/edit-attribute/edit-attribute.component.ts`                                                    | Customers                     | 13      | `EditAttributeComponent`, `editAttribute`, `getAttributeTypes`, `onChannelIdentifierChange`, `onLengthChange`, `onNoClick`                                                          |
| `src/app/customer-schema/schema-settings/schema-settings.component.ts`                                                  | Customers                     | 12      | `SchemaSettingsComponent`, `addAttr`, `changeOrder`, `deleteAttribute`, `displayMenu`, `drop`                                                                                       |
| `src/app/dashboard/components/ai-widget-generator/ai-widget-generator.component.ts`                                     | Insights                      | 8       | `AiWidgetGeneratorComponent`, `cancel`, `confirm`, `generate`, `onConfigChange`                                                                                                     |
| `src/app/dashboard/components/widget-builder/widget-builder.component.ts`                                               | Insights                      | 30      | `WidgetBuilderComponent`, `addThreshold`, `applyDefaultTitle`, `createThresholdFormGroup`, `finish`, `generatePreview`                                                              |
| `src/app/dashboard/components/widget-filters/widget-filters.component.ts`                                               | Insights                      | 21      | `WidgetFiltersComponent`, `applyFilters`, `getAllQueueIds`, `handleQueueIdsChange`, `hasFilters`, `loadBots`                                                                        |
| `src/app/dashboard/components/widget-host/widget-host.component.ts`                                                     | Insights                      | 7       | `WidgetHostComponent`, `getMetricInfo`, `hasFilters`, `onConfigChange`, `onEditClick`, `toggleFilters`                                                                              |
| `src/app/dashboard/components/widgets/generic-chart-widget/generic-chart-widget.component.ts`                           | Insights                      | 49      | `GenericChartWidgetComponent`, `clearHoveredSegment`, `describeDonutSegment`, `extractLabel`, `extractNumericValue`, `fetchData`                                                    |
| `src/app/dashboard/components/widgets/generic-kpi-widget/generic-kpi-widget.component.ts`                               | Insights                      | 20      | `GenericKpiWidgetComponent`, `fetchData`, `formatDuration`, `formatLabel`, `getDefaultSelectedKeys`, `getNormalizedRefreshIntervalMs`                                               |
| `src/app/dashboard/components/widgets/generic-table-widget/generic-table-widget.component.ts`                           | Insights                      | 19      | `GenericTableWidgetComponent`, `fetchData`, `formatHeader`, `getDefaultSelectedKeys`, `getNormalizedRefreshIntervalMs`, `getThresholdColor`                                         |
| `src/app/dashboard/dashboard-routing.module.ts`                                                                         | Insights                      | 1       | `DashboardRoutingModule`                                                                                                                                                            |
| `src/app/dashboard/dashboard.module.ts`                                                                                 | Insights                      | 1       | `DashboardModule`                                                                                                                                                                   |
| `src/app/dashboard/pages/dashboard-page/dashboard-page.component.ts`                                                    | Insights                      | 35      | `DashboardPageComponent`, `addTab`, `cancelRename`, `captureGridMetricsForResize`, `clampInt`, `commitRename`                                                                       |
| `src/app/dashboard/services/ai-widget.service.ts`                                                                       | Insights                      | 5       | `AiWidgetService`, `generateWidgetConfig`, `initEngine`, `parseJsonResponse`                                                                                                        |
| `src/app/dashboard/services/dashboard-resolution.service.ts`                                                            | Insights                      | 13      | `DashboardResolutionService`, `filterMrds`, `filterQueues`, `getFromCache`, `invalidateCache`, `isTeamValid`                                                                        |
| `src/app/dashboard/services/dashboard.service.ts`                                                                       | Insights                      | 21      | `DashboardService`, `addTab`, `addWidget`, `applyAndMigrate`, `createDefaultDashboard`, `currentDashboard`                                                                          |
| `src/app/dashboard/services/reporting-api.service.ts`                                                                   | Insights                      | 24      | `ReportingApiService`, `baseUrl`, `getAbandonedRatioSummary`, `getActiveQueues`, `getAgentConsultSummary`, `getAgentHourlyHandledSummary`                                           |
| `src/app/dialogs/link-conversation-dialog/link-conversation-dialog.component.ts`                                        | Workspace                     | 3       | `LinkConversationDialogComponent`, `sendResponse`                                                                                                                                   |
| `src/app/download.directive.ts`                                                                                         | Shared behavior helpers       | 6       | `DownloadDirective`, `href`, `onClick`, `safeHref`                                                                                                                                  |
| `src/app/features/outbound-communication/components/dial-pad/dial-pad.component.ts`                                     | Customers / Outbound          | 4       | `DialPadComponent`, `getAriaLabel`, `onKeyPress`, `trackByKey`                                                                                                                      |
| `src/app/features/outbound-communication/components/outbound-panel/outbound-panel.component.ts`                         | Customers / Outbound          | 78      | `OutboundPanelComponent`, `browseModeCustomer`, `buildAutoCreateCustomerPayload`, `canPlaceVoiceCall`, `canSendOutboundMessage`, `cancelCompose`                                    |
| `src/app/features/outbound-communication/outbound-communication.module.ts`                                              | Customers / Outbound          | 1       | `OutboundCommunicationModule`                                                                                                                                                       |
| `src/app/file-preview/file-preview.component.ts`                                                                        | Workspace                     | 3       | `FilePreviewComponent`, `close`                                                                                                                                                     |
| `src/app/interceptors/auth.interceptor.ts`                                                                              | Identity / Session            | 7       | `AuthInterceptor`, `addToken`, `getAgentId`, `handle401Error`, `intercept`, `logout`                                                                                                |
| `src/app/is-ellipsis-active.directive.ts`                                                                               | Shared behavior helpers       | 4       | `IsEllipsisActiveDirective`, `isOverflowing`, `onMouseEnter`                                                                                                                        |
| `src/app/is-logged-in.guard.ts`                                                                                         | Shared platform / integration | 3       | `IsLoggedInGuard`, `canActivate`                                                                                                                                                    |
| `src/app/labels/create-label/create-label.component.ts`                                                                 | Customers                     | 8       | `CreateLabelComponent`, `ValidateNameDuplication`, `createLabel`, `onNoClick`, `onSaveLabel`, `updateLabel`                                                                         |
| `src/app/labels/labels-list/labels-list.component.ts`                                                                   | Customers                     | 8       | `LabelsListComponent`, `deleteLabel`, `loadLabels`, `onDelete`, `openLabelDialog`, `showMeta`                                                                                       |
| `src/app/login/login.component.ts`                                                                                      | Identity / Session            | 19      | `LoginComponent`, `changeAgentDeskLanguage`, `clearStaleAuthSession`, `confirmEmail`, `confirmPhoneNumber`, `editEmail`                                                             |
| `src/app/new-components/audio-player/audio-player/audio-player.component.ts`                                            | Shared platform / integration | 27      | `AudioPlayerComponent`, `bindAudioEvent`, `clearAudioListeners`, `clearUrlPoll`, `createWaveSurfer`, `decodePeaksFromBlob`                                                          |
| `src/app/new-components/call-controls/call-controls.component.ts`                                                       | Voice                         | 43      | `CallControlsComponent`, `bargeInConverstion`, `blurRecordingControl`, `canManageCallRecording`, `cancel`, `consultConferenceRequest`                                               |
| `src/app/new-components/confirmation-dialog/confirmation-dialog.component.ts`                                           | Shared platform / integration | 5       | `ConfirmationDialogComponent`, `cancel`, `confirm`                                                                                                                                  |
| `src/app/new-components/inactivity-warning/inactivity-warning.component.ts`                                             | Identity / Session            | 5       | `InactivityWarningComponent`, `stayLoggedIn`                                                                                                                                        |
| `src/app/new-components/inline-audio-player/inline-audio-player.component.ts`                                           | Shared platform / integration | 8       | `InlineAudioPlayerComponent`, `onEnded`, `onLoadedMetadata`, `onPause`, `onPlay`, `onTimeUpdate`                                                                                    |
| `src/app/new-components/settings/settings.component.ts`                                                                 | Shell / Preferences           | 18      | `SettingsComponent`, `allowedHomePages`, `getAgentSettings`, `getSupportedLanguages`, `hasChanges`, `initializeTempValues`                                                          |
| `src/app/no-route-found/no-route-found.component.ts`                                                                    | Shared platform / integration | 2       | `NoRouteFoundComponent`                                                                                                                                                             |
| `src/app/notifications/chat-notifications/chat-notifications.component.ts`                                              | Shared platform / integration | 35      | `ChatNotificationsComponent`, `acceptCall`, `closeAgentMenu`, `dismissAllPullMode`, `dismissPasswordWarning`, `getTopicSubscription`                                                |
| `src/app/phonebook/phonebook.component.ts`                                                                              | Customers                     | 75      | `Cfilter`, `OnItemDeSelect`, `PhonebookComponent`, `actions`, `addFilterRow`, `applyFilter`                                                                                         |
| `src/app/plainTextOnly.directive.ts`                                                                                    | Shared behavior helpers       | 4       | `PlainTextPasteDirective`, `handlePaste`, `insertPlainText`                                                                                                                         |
| `src/app/pull-mode/subscribed-list-preview/subscribed-list-preview.component.ts`                                        | Subscribed lists              | 7       | `SubscribedListPreviewComponent`, `closeChat`, `joinChat`, `listPreviewToggle`, `loadLabels`                                                                                        |
| `src/app/pull-mode/subscribed-list/subscribed-list.component.ts`                                                        | Subscribed lists              | 8       | `SubscribedListComponent`, `eventFromChild`, `isChecked`, `toggle`, `updateSubscribeList`                                                                                           |
| `src/app/quick-replies-dialog/quick-replies-dialog.component.ts`                                                        | Workspace                     | 18      | `QuickRepliesDialogComponent`, `applyFilter`, `canSave`, `close`, `deleteQuickReply`, `extractQuickRepliesPayload`                                                                  |
| `src/app/same-origin-token.ts`                                                                                          | Shared platform / integration | 1       | `factory`                                                                                                                                                                           |
| `src/app/services/ai-text-refine.service.ts`                                                                            | Shared platform / integration | 6       | `AiRefineError`, `AiTextRefineService`, `handleError`, `refineText`                                                                                                                 |
| `src/app/services/announcement.service.ts`                                                                              | Announcements                 | 10      | `AnnouncementService`, `addCreatedAnnoucement`, `addingQmNotifications`, `countUnreadAnnouncement`, `getAnnouncementList`, `getQmNotifcations`                                      |
| `src/app/services/appConfig.service.ts`                                                                                 | Shared platform / integration | 15      | `appConfigService`, `applyRuntimeConfig`, `convertBlobToBase64`, `decryptSecret`, `downloadAndSaveLogo`, `ensureTenantLogo`                                                         |
| `src/app/services/auth.service.ts`                                                                                      | Identity / Session            | 7       | `AuthService`, `checkScope`, `getCurrentActivatedRoute`, `handlePermissionIfCCUserExists`, `moveToAuthorizedResourceOnLogin`, `navigateToHomePage`                                  |
| `src/app/services/cache.service.ts`                                                                                     | Shared platform / integration | 12      | `CacheService`, `cacheCustomerSchema`, `clearOutboundSmsDialogData`, `clearQuickReplies`, `loadPullModeList`, `loadQuickReplies`                                                    |
| `src/app/services/call-timers.service.ts`                                                                               | Voice                         | 4       | `CallTimersService`, `consultMsToHMS`, `formatNumber`, `msToHMS`                                                                                                                    |
| `src/app/services/channel-selection.service.ts`                                                                         | Outbound / Compliance         | 9       | `ChannelSelectionService`, `clearCache`, `filterChannelsByType`, `getChannelDisplayLabel`, `getChannelTypes`, `getConfiguredChannels`                                               |
| `src/app/services/crmEvents.service.ts`                                                                                 | CRM bridge                    | 11      | `CrmEventsService`, `chatSwitching`, `handleAgentAndMrdStateChangeEvents`, `handleTopicDataEvent`, `postCRMEvent`, `receiveMessage`                                                 |
| `src/app/services/encryption.service.ts`                                                                                | Shared platform / integration | 2       | `encrypt`, `encryptionService`                                                                                                                                                      |
| `src/app/services/fallback-translate-loader.ts`                                                                         | Language platform             | 3       | `FallbackTranslateLoader`, `getTranslation`                                                                                                                                         |
| `src/app/services/fcm.service.ts`                                                                                       | Shared platform / integration | 3       | `deleteFcmToken`, `fcmService`                                                                                                                                                      |
| `src/app/services/finesse.service.ts`                                                                                   | Voice                         | 41      | `acceptCallOnFinesse`, `ccmChannelSessionApi`, `changeFinesseState`, `checkActiveTasks`, `clearLocalDialogCache`, `createCIMMessage`                                                |
| `src/app/services/graphql.service.ts`                                                                                   | Shared platform / integration | 8       | `GraphqlService`, `buildDynamicGQLQueryString`, `buildFilterObject`, `buildSearchActivitiesQuery`, `buildSearchConversationsQuery`, `escapeGraphQLString`                           |
| `src/app/services/holdTimer.service.ts`                                                                                 | Shared platform / integration | 8       | `HoldTimerService`, `convertMsToHMS`, `formatNumber`, `startHoldTimer`, `startHoldTimerConsult`, `stopHoldTimer`                                                                    |
| `src/app/services/http.service.ts`                                                                                      | Shared platform / integration | 106     | `AnnouncementSeenByUser`, `addAnnouncemenent`, `addCustomerSchema`, `ccmVOICEChannelSession`, `changeCustomerSchemaOrder`, `checkDnc`                                               |
| `src/app/services/i18n-translations-cache.ts`                                                                           | Language platform             | 3       | `get`, `has`, `set`                                                                                                                                                                 |
| `src/app/services/i18n.service.ts`                                                                                      | Language platform             | 15      | `I18nService`, `applyTranslations`, `extractLanguageCodes`, `fetchLocaleSettings`, `fetchTranslationsFromApi`, `getFileServerUrl`                                                   |
| `src/app/services/inactivity.service.ts`                                                                                | Identity / Session            | 14      | `InactivityService`, `attachListeners`, `checkLoop`, `detachListeners`, `handleBlur`, `handleFocus`                                                                                 |
| `src/app/services/isLoggedIn.service.ts`                                                                                | Shared platform / integration | 14      | `IsLoggedInService`, `_showPasswordWarningFromLogin`, `autoFinesseLogin`, `autoLogin`, `cacheAgentFcmKey`, `externalServiceLogin`                                                   |
| `src/app/services/menu-config.service.ts`                                                                               | Shared platform / integration | 11      | `MenuConfigService`, `canViewDashboardPermissionForAgent`, `canViewDashboardPermissionForSupervisor`, `clearCache`, `getAllMenuItems`, `getDashboardMenuItems`                      |
| `src/app/services/messaging.service.ts`                                                                                 | Realtime workspace            | 5       | `MessagingService`, `destroyInstance`, `getInstance`, `manageInstances`                                                                                                             |
| `src/app/services/outbound-compliance.service.ts`                                                                       | Outbound / Compliance         | 13      | `OutboundComplianceService`, `applyAdminDncResult`, `blockIfSuppressed`, `blockIfSuppressedAsync`, `buildAdminDncPayload`, `checkAdminDncList`                                      |
| `src/app/services/outbound.service.ts`                                                                                  | Outbound / Compliance         | 28      | `OutboundService`, `applyPrefix`, `clearSearch`, `closeDialPad`, `closePanel`, `convertZerosToPlus`                                                                                 |
| `src/app/services/preloading.service.ts`                                                                                | Shared platform / integration | 3       | `preload`, `preloadingService`                                                                                                                                                      |
| `src/app/services/pullMode.service.ts`                                                                                  | Subscribed lists              | 12      | `addPullModeSubscribedListRequests`, `deleteRequestById`, `getPullModeList`, `initializedSubscribedListRequests`, `loadLabels`, `pullModeService`                                   |
| `src/app/services/shared.service.ts`                                                                                    | Shared platform / integration | 48      | `Interceptor`, `_announcementService`, `_cacheService`, `_router`, `_socketService`, `changelanguage`                                                                               |
| `src/app/services/sip.service.ts`                                                                                       | Voice                         | 155     | `SipService`, `acceptCallOnSip`, `agentConsultOnSip`, `areAllParticipantsActive`, `bargeIn`, `browserPermissionErrorMessage`                                                        |
| `src/app/services/snackbar.service.ts`                                                                                  | Shared platform / integration | 4       | `close`, `open`, `snackbarService`                                                                                                                                                  |
| `src/app/services/socket.service.ts`                                                                                    | Realtime workspace            | 93      | `addChannelSession`, `addParticipantsToLastSeenMessage`, `addParticipantsToTheLastSeenMessage`, `calculateDateDifferenceInSeconds`, `callFromNotification`, `changeTopicCustomer`   |
| `src/app/services/sounds.service.ts`                                                                                    | Shared platform / integration | 7       | `openBrowserNotification`, `playBeep`, `playRing`, `playVoiceRing`, `soundService`, `stopRing`                                                                                      |
| `src/app/services/spellCheck.service.ts`                                                                                | Shared platform / integration | 6       | `SpellcheckService`, `check`, `getCurrentLanguage`, `loadDictionary`, `suggest`                                                                                                     |
| `src/app/shared/components/email-composer/email-composer.component.ts`                                                  | Workspace                     | 25      | `EmailComposerComponent`, `addEmailsInAddressBar`, `addQuotedContent`, `applyEmailSignature`, `attachmentButton`, `canSendEmail`                                                    |
| `src/app/shared/components/message-composer/message-composer.component.ts`                                              | Workspace                     | 40      | `MessageComposerComponent`, `applyQuickReply`, `chooseSuggestion`, `clearComposer`, `convertUnicodeToEmojis`, `displayEmoji`                                                        |
| `src/app/shared/components/outbound-from-channel-select/outbound-from-channel-select.component.ts`                      | Outbound / Compliance         | 14      | `OutboundFromChannelSelectComponent`, `getDisplayLabel`, `getOptionLabel`, `hasDistinctName`, `isDefaultChannel`, `loadChannels`                                                    |
| `src/app/shared/components/sentiment/sentiment.component.ts`                                                            | Shared platform / integration | 1       | `SentimentComponent`                                                                                                                                                                |
| `src/app/shared/shared.module.ts`                                                                                       | Shared platform / integration | 1       | `SharedModule`                                                                                                                                                                      |
| `src/app/supervisor/active-agent-details/active-agent-details.component.ts`                                             | Supervise / Insights          | 14      | `ActiveAgentDetailsComponent`, `filterData`, `filterDataSupervisor`, `getAllActiveAgentDetails`, `getAllMrds`, `getSecondarySupervisors`                                            |
| `src/app/supervisor/active-chats/active-chats.component.ts`                                                             | Supervise / Insights          | 27      | `ActiveChatsComponent`, `OnItemDeSelect`, `filterChange`, `filterData`, `filterDataSupervisor`, `getAllActiveChatsWithBots`                                                         |
| `src/app/supervisor/agent-performance/agent-performance.component.ts`                                                   | Supervise / Insights          | 13      | `AgentPerformanceComponent`, `getIframeDocSrc`, `getTeamName`, `getUserId`, `getUsername`, `makeFiltersQuery`                                                                       |
| `src/app/supervisor/announcement-dialog/announcement-dialog.component.ts`                                               | Supervise / Insights          | 13      | `AnnouncementDialogComponent`, `OnItemDeSelect`, `changeData`, `getAllAnnouncementList`, `onClose`, `onCreateAnnouncement`                                                          |
| `src/app/supervisor/dashboard/supervisor-dashboard.component.ts`                                                        | Supervise / Insights          | 5       | `DashboardComponent`, `applyFilter`, `infoBar`, `toggleExpand`                                                                                                                      |
| `src/app/supervisor/grafana/grafana.component.ts`                                                                       | Supervise / Insights          | 15      | `GrafanaComponent`, `convertArrayToString`, `getIframeDocSrc`, `getTeamName`, `getTeamsId`, `getUsername`                                                                           |
| `src/app/supervisor/queue-chats/queue-chats.component.ts`                                                               | Supervise / Insights          | 18      | `OnItemDeSelect`, `QueueChatsComponent`, `filterData`, `getAllQueuedChats`, `loadLabels`, `onDeSelectAll`                                                                           |
| `src/app/supervisor/recent-chats/recent-chats.component.ts`                                                             | Supervise / Insights          | 16      | `RecentChatsComponent`, `getConversations`, `loadConversations`, `onChannelChange`, `onColReorder`, `onCustomerSearchChange`                                                        |
| `src/app/supervisor/supervisor-detail/supervisor-detail.component.ts`                                                   | Supervise / Insights          | 14      | `SupervisorDetailComponent`, `convertArrayToString`, `getIframeDocSrc`, `getTeamName`, `getTeamsId`, `getUsername`                                                                  |
| `src/app/supervisor/supervisor-stats/supervisor-stats.component.ts`                                                     | Supervise / Insights          | 14      | `SupervisorStatsComponent`, `convertArrayToString`, `getIframeDocSrc`, `getTeamName`, `getTeamsId`, `getUsername`                                                                   |
| `src/app/utils/agent-desk-settings.util.ts`                                                                             | Shared platform / integration | 2       | `resolveAgentDeskSettings`, `resolveAgentDeskSettingsList`                                                                                                                          |
| `src/app/voicemail-inbox/voicemail-inbox.component.ts`                                                                  | Voicemail / Workspace         | 14      | `VoicemailInboxComponent`, `formatDuration`, `getUnreadCount`, `getVoicemails`, `loadVoicemails`, `markAsRead`                                                                      |

## Unified Agent source helpers

The executable inventory above excludes shared pipes/models from its grouped product-surface listing. These helpers are behavior dependencies, particularly authorization, masking, channel detection, comment eligibility, rich-content conversion and time formatting. They must remain attached to their corresponding requirement rather than being dropped as visual utilities.

Authoritative discovery covered the app's Class/Function/Method symbols through graph query. Enumerate remaining File/Interface/Variable symbols and all HTML message branches in Phase 0, including channel-session and participant-role conditions. Graph fast indexing excluded `src/assets`; vendor dependencies are not a substitute for direct wrapper review.

Specific wrapper/integration assets discovered in the graph:

- `src/assets/cti/CTIJsLibrary.js`
- `src/assets/cti/sip-libraries/sip-wrapper.js`
- `src/assets/cti/sip-libraries/sip-0.21.2.js`
- CTI/runtime configuration and Cisco libraries referenced by `src/index.html`.

The four central UA implementation files contain 12,797 lines in this baseline: `interactions.component.ts` 4,674; `socket.service.ts` 3,019; `sip.service.ts` 3,579; `finesse.service.ts` 1,525. Their behavior must be decomposed into state scenarios; those numbers do not imply that every line was manually reviewed.

## Observed socket protocol names

Literal names were extracted from source methods using graph-augmented search. Exact case and spelling matter. This is an observed catalogue, not a backend contract certification; inspect dynamic event names, acknowledgements and other emitting modules in Phase 0.

### Listened-for transport/server events

- `ANNOUNCEMENT_CREATED`
- `ANNOUNCEMENT_DELETED`
- `HandDownNotification`
- `HandRaiseNotification`
- `addPullModeSubscribedListRequests`
- `agentAssignedForAssistance`
- `agentAssistanceRequestPlaced`
- `agentPresence`
- `connect`
- `connect_error`
- `consulTransferRequestSuccess`
- `disconnect`
- `errors`
- `notification`
- `onChannelTypes`
- `onCimEvent`
- `onPullModeSubscribedList`
- `onPullModeSubscribedListRequest`
- `onTopicData`
- `pullModeSubscribedListRequests`
- `removePullModeSubscribedListRequests`
- `revokeTask`
- `socketSessionRemoved`
- `taskRequest`
- `topicUnsubscription`
- `wrapupTimerStarted`

### Observed client command emissions

Sources include socket service, interactions, header, notifications and pull-mode-related matching methods.

- `JoinAsBargin`
- `changeAgentState`
- `closeWrapup`
- `consultConferenceRequest`
- `consultRequest`
- `consultTransferRequest`
- `directConferenceRequest`
- `directTransferRequest`
- `joinAsWhisper`
- `joinPullModeRequest`
- `pauseConversation`
- `publishCimEvent`
- `resumeConversation`
- `topicSubscription`
- `topicUnsubscription`

### Observed CIM event-name dispatch branches

The handler also dispatches by event `type`, including `suggestion` and `activity`; do not limit the adapter to the names below.

- `agent_message`
- `agent_sla_expired`
- `agent_sla_started`
- `agent_sla_stopped`
- `agent_subscribed`
- `agent_unsubscribed`
- `associated_customer_changed`
- `bot_message`
- `channel_session_ended`
- `channel_session_started`
- `conversation_data_changed`
- `conversation_paused`
- `conversation_resumed`
- `customer_message`
- `external_gadget_requested`
- `hand_down`
- `hand_raised`
- `message_delivery_notification`
- `no_agent_available`
- `participant_role_changed`
- `task_enqueued`
- `task_state_changed`
- `typing_indicator`
- `whisper_message`

### Observed voice action strings

These were extracted from SIP/Finesse service and wrapper-related matching source. Preserve spelling such as `conference_consult`, `SendDtmf`, and `SST_Queue`; exhaustively reconcile wrapper command branches and callback schemas before declaring parity.

- `CALL_ANSWER`
- `CALL_INITIATE`
- `SST`
- `SST_Queue`
- `SendDtmf`
- `agentMRDState`
- `agentState`
- `answerCall`
- `bargeIn`
- `conference_consult`
- `consultTransfer`
- `convertCall`
- `getNotReadyLogoutReasons`
- `holdCall`
- `login`
- `logout`
- `makeConsult`
- `makeConsultQueue`
- `makeNotReadyWithReason`
- `makeOBCall`
- `makeReady`
- `mute_call`
- `pauseRecording`
- `registerCallback`
- `rejectCall`
- `releaseCall`
- `resumeRecording`
- `retrieveCall`
- `silentMonitor`
- `unmute_call`

## CRM event direction

The inspected `receiveMessage` handles incoming `action=switchConversation` case-insensitively. The legacy feature checklist's description of “16 events in, switchConversation out” must be rechecked: the inspected implementation sends lifecycle events out to the parent and receives conversation switching in.

Observed outgoing event-name assignments:

- `AGENT_LOGIN`
- `AGENT_STATE_CHANGE`
- `AGENT_TASK_STATE`
- `Channels_Type`
- `Dialog_Ended`
- `END_CONVERSATION`
- `LOGOUT`
- `PARTICIPANT_ROLE_CHANGED`
- `REVOKE_TASK`
- `SILENT_MONITOR`
- `TASK_STATE_CHANGED`
- `WHISPER`
- `WRAPUP`

Also inspect the outgoing chat-switching, theme-change and conversation-data message payloads: those methods construct messages separately from the event-name assignments above. Legacy `postMessage` calls include wildcard targets, and incoming switching lacks an origin check in the reviewed method. Preserve the integration behavior with an explicit trusted-origin contract in the new app.

## Observed Unified Agent action scopes

The following pairs were extracted from source HTML `authPipe` checks. This list supplements the route/menu resource checks; it is not the entire permission policy.

- `agent-conversation-control:view_conference`
- `agent-conversation-control:view_consult`
- `agent-conversation-control:view_direct_transfer`
- `agent-conversation-control:view_history`
- `agent-conversation-control:view_history_active_customer`
- `agent-conversation-control:view_initiate_chat`
- `agent-conversation-control:view_leave_chat`
- `agent-conversation-control:view_wrap_up`
- `call_recording_control:manage_call_recording_control`
- `customer-labels:assign_label`
- `customer:manage`
- `customer:manage_in_conversation`
- `customer:view`
- `customer:view_pii`
- `subscribed-list:manage`
- `subscribed-list:view`
- `supervisor:view_all`

Additional route/menu resources include `customer-schema:view`, `customer-schema:manage`, `customer-labels:manage`, `state-change:manage_state_change`, and `agent-dashboard:view`. Validate masking rules in the PII pipe and backend data policy, including permissions used for historical/fake versus live conversation contexts.

Observed legacy feature flags:

- `feature_CIM_32834_customisedDashboard`
- `feature_CIM_33144_quick_replies`

## Unified Admin scope

Only the Agent Desk Settings UI is in scope:

- `Frontend/src/app/admin/agent-desk-settings/agent-desk-settings.component.ts`, its HTML and SCSS.
- Form initialization, `normalizeGroupedSettings`, `buildGroupedPayload`, dependency/validator methods, static field state and save behavior.
- Endpoint service/settings contracts and `agent-desk-setting` resource scopes.
- `Backend/src/routes/v1/agentDeskSettings.route.js`, its controller/service/model/validation and any mounted/global auth middleware.

The inspected route declares GET and a validation-protected PUT; it does not declare local authentication middleware. Verify mounted/global protection before concluding that the deployed endpoint is open.

The separate `Frontend/src/app/admin/general-settings/locale/` and `general-settings/translations/` editors are outside the requested migrated UI. Language services and translation loading remain runtime dependencies. Some locale files were excluded by fast graph indexing, another reason not to claim full graph coverage.

The exact grouped Agent Desk Settings field inventory and source validation ranges are in the plan. Preserve deliberate payload cleanup in `buildGroupedPayload`: deprecated `getQueuesDelay` and auto-answer fields are removed from old telephony locations while current values belong in conversation handling. Unknown-field preservation must respect this intentional normalization.

## VRS latest-develop executable surfaces

29 non-test implementation files with discovered executable/class symbols:

| Source path                                                                     | Symbols | Representative source symbols                                                                                                                                                     |
| ------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/app-header/app-header.component.ts`                                    | 5       | `AppHeaderComponent`, `logout`, `toggleTheme`                                                                                                                                     |
| `src/app/app-routing.module.ts`                                                 | 1       | `AppRoutingModule`                                                                                                                                                                |
| `src/app/app.component.ts`                                                      | 4       | `AppComponent`, `getToken`                                                                                                                                                        |
| `src/app/app.module.ts`                                                         | 3       | `AppModule`, `initializeApp1`, `useFactory`                                                                                                                                       |
| `src/app/archival-configuration/archival-configuration.component.ts`            | 16      | `ArchivalConfigurationComponent`, `buildSettingsPayload`, `createArchivalSettings`, `getArchivalSettings`, `getTimeDropDown`, `hasFormChanged`, `isCreatingNewTenant`             |
| `src/app/audit-logs/audit-logs.component.ts`                                    | 17      | `AuditLogsComponent`, `applyFilters`, `clearForm`, `getAuditLogs`, `getAuditLogsParams`, `getTimeDropDown`, `hideCustomSearch`                                                    |
| `src/app/clickOutside.ts`                                                       | 6       | `ClickOutsideDirective`, `isInside`, `isInsideMatSelectOrCalender`                                                                                                                |
| `src/app/directives/ellipsis-tooltip.directive.ts`                              | 3       | `EllipsisTooltipDirective`, `onMouseEnter`                                                                                                                                        |
| `src/app/finesse-login/finesse-login.component.ts`                              | 4       | `FinesseLoginComponent`, `login`                                                                                                                                                  |
| `src/app/guards/auth.guard.ts`                                                  | 3       | `AuthGuard`, `canActivate`                                                                                                                                                        |
| `src/app/interceptors/auth.interceptor.ts`                                      | 3       | `AuthInterceptor`, `intercept`                                                                                                                                                    |
| `src/app/is-logged-in.guard.ts`                                                 | 3       | `IsLoggedInGuard`, `canActivate`                                                                                                                                                  |
| `src/app/login/login.component.ts`                                              | 6       | `LoginComponent`, `finesseLogin`, `login`, `updateFormErrors`                                                                                                                     |
| `src/app/no-route-component/no-route-component.component.ts`                    | 3       | `NoRouteComponentComponent`                                                                                                                                                       |
| `src/app/recording-rules/recording-rule-form/recording-rule-form.component.ts`  | 12      | `RecordingRuleFormComponent`, `childChanged`, `close`, `getRuleFormValues`, `getTimeDropDown`, `hasFormChanged`, `maskValidator`                                                  |
| `src/app/recording-rules/recording-rules.component.ts`                          | 14      | `RecordingRulesComponent`, `checkIfMoreRecordsNeeded`, `createRecordingRule`, `deleteRecordingRule`, `drop`, `getRecordingRules`, `onTableScroll`                                 |
| `src/app/services/auth.service.ts`                                              | 18      | `AuthService`, `canAssignRecordingTags`, `canManageTags`, `canViewRecordingTags`, `checkUserPermissions`, `checkUserRoles`, `getToken`                                            |
| `src/app/services/config.service.ts`                                            | 3       | `ConfigService`, `loadConfig`                                                                                                                                                     |
| `src/app/services/csv-export.service.ts`                                        | 22      | `CsvExportService`, `buildEnhancedHeaders`, `buildFileName`, `computeDuration`, `convertToCsvString`, `downloadCSV`, `extractDate`                                                |
| `src/app/services/http.service.ts`                                              | 25      | `addAuditLogs`, `assignRecordingTag`, `createArchivalSettings`, `createRecordingRule`, `createTag`, `deleteRecordingRule`, `deleteTag`                                            |
| `src/app/services/snackbar.service.ts`                                          | 5       | `SnackbarService`, `error`, `showSnackBar`, `success`                                                                                                                             |
| `src/app/services/theme.service.ts`                                             | 5       | `ThemeService`, `applyStoredTheme`, `getStoredTheme`, `isDarkMode`, `toggleTheme`                                                                                                 |
| `src/app/shared/loading-overlay/loading-overlay.component.ts`                   | 1       | `LoadingOverlayComponent`                                                                                                                                                         |
| `src/app/tag-management/tag-form/tag-form.component.ts`                         | 5       | `TagFormComponent`, `close`, `onSubmit`                                                                                                                                           |
| `src/app/tag-management/tag-management.component.ts`                            | 9       | `TagManagementComponent`, `createTag`, `deleteTag`, `loadTags`, `openTagForm`, `toErrorMessage`, `updateTag`                                                                      |
| `src/app/voice-recordings/audio-player-dialog/audio-player-dialog.component.ts` | 17      | `AudioPlayerDialogComponent`, `canSkip`, `close`, `cyclePlaybackSpeed`, `formatTime`, `forward`, `globalKeyboardEvents`                                                           |
| `src/app/voice-recordings/audio-player-dialog/wav-peaks.util.ts`                | 4       | `aLawToLinear`, `extractWavPeaks`, `muLawToLinear`, `tag`                                                                                                                         |
| `src/app/voice-recordings/video-player/video-player.component.ts`               | 34      | `VideoPlayerComponent`, `animateProgress`, `bindKeyBoardEventToSpeedMenu`, `bindMouseEventToSeekbar`, `endAnimation`, `formatTime`, `forward`                                     |
| `src/app/voice-recordings/voice-recordings.component.ts`                        | 44      | `VoiceRecordingsComponent`, `addAuditLogRequest`, `buildSearchParams`, `callVariableValuePlaceholder`, `checkAndResetScrollToTop`, `checkAndResetToFirstPage`, `cleanFilterValue` |

Associated recording models, tag model, profile-specific templates and player styles remain part of each requirement. Current develop includes the waveform player and WAV peak decoder, newer table and pagination behavior, tag catalogue and assignment, download formats and CSV export work.

Important verified contract details:

- Recording filter mapping: called number → `agentExtension`; calling number → `customerNumber`; agent name → `AgentName`; duration, hold time, wrap-up codes, direction, start/end time, tag id/name; call variable key/value pair.
- `getRecordings` supports paged `{ data, total }` when server paging is enabled and accepts an array fallback. Current initialization enables server paging for CISCO and EFCX. Page size is bounded to 1–100 in the source.
- Tags are catalogue-managed by admin. Recording tag view needs `viewtag` or `evaluatetag`; assignment/unassignment needs `evaluatetag`. Tag features have deployment-profile constraints.
- VRS role priority is admin > supervisor > agent. Rules/tag navigation is hidden on EFCX; audit/archival and management routes exclude agent-level users. Validate deep-link behavior separately from header visibility.
- Archival form includes enable, tenant id on EFCX, external server IP, folder path, username, password, archive mode, retention days and copy time. Source retention range is 1–364 days and password minimum is six characters.
- Rule form includes action/type/mask, capture and disabled capture-usage field, from/to time and weekdays, plus mask/time-range validation.
- CSV export has profile-specific columns and full-result fetching, plus success/failure auditing. Verify headers, phone representation, date locale and multi-leg flattening against sample exports.

## Current Agent Desk 2.0 review anchors

| Source                                         | Observed state / consequence                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/core/auth/permissions/resources.ts`       | Common resource/role registry exists; explicit legacy conversation/action scopes need a full audit.                     |
| `src/core/auth/permissions/usePermission.ts`   | Generic capability helpers and an ad-hoc `useScope` exist. Existence alone does not demonstrate action gating.          |
| `src/features/workspace/ConversationsPage.tsx` | Existing 1/2/3 split controls and responsive list/pane navigation.                                                      |
| `src/features/workspace/store/boardStore.ts`   | Three pane slots, focus, open-existing focus and selected-pane replacement.                                             |
| `src/features/workspace/model/display.ts`      | Fixed 60/120-second waiting severity; distinguish visual waiting from configurable source SLA.                          |
| `src/features/voice/callStore.ts`              | Reviewed SIP reducer covers basic registration/ringing/active/held/ended cases.                                         |
| `src/features/voice/voiceSession.ts`           | Existing scripts, tenant lookup and provider registration; advanced source state recovery still requires verification.  |
| `src/features/insights/RealtimePage.tsx`       | Fixed count cards/queue table; source custom dashboard builder is substantially richer.                                 |
| `src/app/navigation/navConfig.ts`              | Domain navigation and permissions exist, including Languages/Translations that exceed the user's stated Admin UI scope. |
| `docs/FEATURE_PARITY.md`                       | Existing status claims require revalidation; VRS source reference predates latest develop.                              |
| `docs/BACKEND_PREREQUISITES.md`                | Useful dependency list; pagination/tag branch claims and service-401 handling need reconciliation with this plan.       |

## Completing the audit

This discovery artifact gives every listed product surface a destination and highlights hidden protocol/policy dependencies. It does not replace the atomic parity ledger. Before implementation acceptance:

1. Add all template branches, interfaces/payload fields, dynamic command names, assets, deployment/config fields and user-visible actions.
2. Trace each action to its API/event and eventual acknowledgement or state change; graph edges that accidentally resolve common names to vendor functions must be checked against source.
3. Add role/channel/provider/profile/flag variants and source bug classifications.
4. Compare all existing AD2 completion claims with real integration evidence.
5. Record source changes after the pinned develop heads and include them in cutover review.
