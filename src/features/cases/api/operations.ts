/**
 * GraphQL operations of the case-management backend, copied verbatim from
 * case-console (graphql/*.graphql.ts and widget/graphql/widget.graphql.ts, branch
 * ui_f-revamp). The conversation-tab variants keep their source names with a WIDGET_ prefix.
 */

export const DISTRIBUTION_POLICY_QUERY = /* GraphQL */ `
  query DistributionPolicy {
    distributionPolicy {
      distributionMode
      agentClaimEnabled
      agentClaimAllowed
      createAssigneeEnabled
      dashboardRefreshSeconds
    }
  }
`;

export const CASE_FIELDS = /* GraphQL */ `
  fragment CaseFields on Case {
    id
    caseReferenceId
    title
    description
    priority
    customerProfileId
    categoryId
    subCategoryId
    category {
      id
      code
      name
    }
    subCategory {
      id
      code
      name
    }
    assignedGroupId
    assignedUserId
    createdByUserId
    customerTier
    resolutionDueAt
    slaState
    slaPausedAt
    slaMinutesRemaining
    slaTimeLabel
    resolvedAt
    closedAt
    createdAt
    updatedAt
    status {
      id
      code
      label
      statusCategory
      pausesSla
    }
    conversations {
      id
      interactionId
      linkedAt
      customerName
      agentName
      channel
      summary
      summaryAt
      summarySource
    }
    attachments {
      id
      caseId
      commentId
      externalFileId
      fileName
      mimeType
      sizeBytes
      mediaUrl
      createdAt
    }
    comments {
      id
      caseId
      authorUserId
      body
      createdAt
      updatedAt
      attachments {
        id
        caseId
        commentId
        externalFileId
        fileName
        mimeType
        sizeBytes
        mediaUrl
        createdAt
      }
    }
  }
`;

export const CASES_QUERY = /* GraphQL */ `
  query Cases($first: Int, $after: String) {
    cases(first: $first, after: $after) {
      nodes {
        ...CaseFields
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
  ${CASE_FIELDS}
`;

export const UNASSIGNED_CASES_QUERY = /* GraphQL */ `
  query UnassignedCases($first: Int, $after: String) {
    unassignedCases(first: $first, after: $after) {
      nodes {
        ...CaseFields
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
  ${CASE_FIELDS}
`;

export const MY_CASES_QUERY = /* GraphQL */ `
  query MyCases($first: Int, $after: String) {
    myCases(first: $first, after: $after) {
      nodes {
        ...CaseFields
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
  ${CASE_FIELDS}
`;

export const SEARCH_WORKBENCH_CASES_QUERY = /* GraphQL */ `
  query SearchWorkbenchCases($query: String!, $includeTerminal: Boolean, $limit: Int) {
    searchWorkbenchCases(query: $query, includeTerminal: $includeTerminal, limit: $limit) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const CASE_QUERY = /* GraphQL */ `
  query Case($id: ID!) {
    case(id: $id) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const CUSTOMER_CASE_INSIGHT_QUERY = /* GraphQL */ `
  query CustomerCaseInsight($customerProfileId: String!) {
    customerCaseInsight(customerProfileId: $customerProfileId) {
      openCaseCount
      windowHours
      recentCases {
        id
        caseReferenceId
        title
        status {
          code
          label
        }
      }
    }
  }
`;

export const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      userId
      username
      roles
      groups
    }
  }
`;

export const SUPERVISOR_DASHBOARD_QUERY = /* GraphQL */ `
  query SupervisorDashboard {
    supervisorDashboard {
      totalOpen
      totalUnassigned
      totalAtRisk
      totalBreached
      groups {
        groupKey
        groupLabel
        openCount
        unassignedCount
        atRiskCount
        breachedCount
      }
    }
  }
`;

export const OPERATIONS_DASHBOARD_QUERY = /* GraphQL */ `
  query OperationsDashboard($groupKey: String, $filter: ReportFilterInput) {
    operationsDashboard(groupKey: $groupKey, filter: $filter) {
      asOf
      refreshIntervalSeconds
      totals {
        open
        unassigned
        atRisk
        breached
        createdToday
        oldestOpenAgeMinutes
      }
      byGroup {
        groupKey
        groupLabel
        openCount
        unassignedCount
        atRiskCount
        breachedCount
      }
      byStatus {
        key
        label
        count
      }
      byPriority {
        key
        label
        count
      }
      byAssignee {
        userId
        openCount
      }
      dueSoon {
        id
        caseReferenceId
        title
        resolutionDueAt
        slaState
        assignedGroupId
        priority
      }
      velocity {
        claimsLastHour
        resolvesLastHour
        reassignmentsLastHour
      }
    }
  }
`;

export const CREATE_CASE_MUTATION = /* GraphQL */ `
  mutation CreateCase($input: CreateCaseInput!) {
    createCase(input: $input) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const CLAIM_CASE_MUTATION = /* GraphQL */ `
  mutation ClaimCase($caseId: ID!) {
    claimCase(caseId: $caseId) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const BULK_CLAIM_CASES_MUTATION = /* GraphQL */ `
  mutation BulkClaimCases($caseIds: [ID!]!) {
    bulkClaimCases(caseIds: $caseIds) {
      succeeded {
        id
        caseReferenceId
      }
      failed {
        caseId
        code
        message
      }
    }
  }
`;

export const ROUTING_GROUPS_FOR_REASSIGN_QUERY = /* GraphQL */ `
  query RoutingGroupsForReassign {
    routingGroupsForReassign {
      status
      message
      groups {
        id
        name
      }
    }
  }
`;

export const ROUTING_GROUP_MEMBERS_QUERY = /* GraphQL */ `
  query RoutingGroupMembers($groupKey: String!) {
    routingGroupMembers(groupKey: $groupKey) {
      userId
      username
      displayName
    }
  }
`;

export const CREATE_CASE_ASSIGNEE_CANDIDATES_QUERY = /* GraphQL */ `
  query CreateCaseAssigneeCandidates($groupKey: String!) {
    createCaseAssigneeCandidates(groupKey: $groupKey) {
      userId
      username
      displayName
    }
  }
`;

export const REASSIGN_CASE_MUTATION = /* GraphQL */ `
  mutation ReassignCase($input: ReassignCaseInput!) {
    reassignCase(input: $input) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const BULK_REASSIGN_CASES_MUTATION = /* GraphQL */ `
  mutation BulkReassignCases($input: BulkReassignInput!) {
    bulkReassignCases(input: $input) {
      succeeded {
        id
        caseReferenceId
      }
      failed {
        caseId
        code
        message
      }
    }
  }
`;

export const RESOLVE_CASE_MUTATION = /* GraphQL */ `
  mutation ResolveCase($caseId: ID!) {
    resolveCase(caseId: $caseId) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const BULK_RESOLVE_CASES_MUTATION = /* GraphQL */ `
  mutation BulkResolveCases($caseIds: [ID!]!) {
    bulkResolveCases(caseIds: $caseIds) {
      succeeded {
        id
        caseReferenceId
      }
      failed {
        caseId
        code
        message
      }
    }
  }
`;

export const REOPEN_CASE_MUTATION = /* GraphQL */ `
  mutation ReopenCase($caseId: ID!) {
    reopenCase(caseId: $caseId) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const CLOSE_CASE_MUTATION = /* GraphQL */ `
  mutation CloseCase($caseId: ID!) {
    closeCase(caseId: $caseId) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const BULK_CLOSE_CASES_MUTATION = /* GraphQL */ `
  mutation BulkCloseCases($caseIds: [ID!]!) {
    bulkCloseCases(caseIds: $caseIds) {
      succeeded {
        id
        caseReferenceId
      }
      failed {
        caseId
        code
        message
      }
    }
  }
`;

export const CASE_AUDIT_LOG_QUERY = /* GraphQL */ `
  query CaseAuditLog($caseId: ID!) {
    caseAuditLog(caseId: $caseId) {
      id
      caseId
      action
      actionLabel
      performedBy
      createdAt
      summary
      changes {
        field
        fieldLabel
        fromValue
        toValue
      }
    }
  }
`;

export const ADD_COMMENT_MUTATION = /* GraphQL */ `
  mutation AddComment($input: AddCommentInput!) {
    addComment(input: $input) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const DELETE_COMMENT_MUTATION = /* GraphQL */ `
  mutation DeleteComment($commentId: ID!) {
    deleteComment(commentId: $commentId) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const ALLOWED_CASE_TRANSITIONS_QUERY = /* GraphQL */ `
  query AllowedCaseTransitions($caseId: ID!) {
    allowedCaseTransitions(caseId: $caseId) {
      id
      code
      label
      statusCategory
      pausesSla
      isResolvedState
      isTerminal
    }
  }
`;

export const UPDATE_CASE_MUTATION = /* GraphQL */ `
  mutation UpdateCase($input: UpdateCaseInput!) {
    updateCase(input: $input) {
      ...CaseFields
    }
  }
  ${CASE_FIELDS}
`;

export const CATEGORIES_QUERY = /* GraphQL */ `
  query Categories {
    categories {
      id
      code
      name
      isActive
      sortOrder
      subCategories {
        id
        code
        name
        isActive
        sortOrder
        routingRule {
          id
          keycloakGroupId
          priority
          isActive
        }
      }
    }
  }
`;

export const RESOLVE_ROUTING_QUERY = /* GraphQL */ `
  query ResolveRouting($categoryId: ID!, $subCategoryId: ID!) {
    resolveRouting(categoryId: $categoryId, subCategoryId: $subCategoryId) {
      keycloakGroupId
      source
    }
  }
`;

export const ADMIN_CATEGORIES_QUERY = /* GraphQL */ `
  query AdminCategories {
    adminCategories {
      id
      code
      name
      isActive
      sortOrder
      subCategories {
        id
        code
        name
        isActive
        sortOrder
        routingRule {
          id
          keycloakGroupId
          priority
          isActive
        }
      }
    }
  }
`;

export const TENANT_SETTINGS_QUERY = /* GraphQL */ `
  query TenantSettings {
    tenantSettings {
      id
      defaultAssignedGroupId
      reopenDays
      auditRetentionDays
      recentCasesWindowHours
      dashboardRefreshSeconds
      distributionMode
      agentClaimEnabled
      createAssigneeEnabled
      updatedAt
    }
  }
`;

export const UPDATE_TENANT_SETTINGS_MUTATION = /* GraphQL */ `
  mutation UpdateTenantSettings($input: UpdateTenantSettingsInput!) {
    updateTenantSettings(input: $input) {
      id
      reopenDays
      auditRetentionDays
      recentCasesWindowHours
      dashboardRefreshSeconds
      defaultAssignedGroupId
      distributionMode
      agentClaimEnabled
      createAssigneeEnabled
      updatedAt
    }
  }
`;

export const UPSERT_ROUTING_RULE_MUTATION = /* GraphQL */ `
  mutation UpsertRoutingRule($input: UpsertRoutingRuleInput!) {
    upsertRoutingRule(input: $input) {
      id
      categoryId
      subCategoryId
      keycloakGroupId
      priority
      isActive
    }
  }
`;

export const UPDATE_CATEGORY_MUTATION = /* GraphQL */ `
  mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
      name
      isActive
    }
  }
`;

export const UPDATE_SUB_CATEGORY_MUTATION = /* GraphQL */ `
  mutation UpdateSubCategory($id: ID!, $input: UpdateSubCategoryInput!) {
    updateSubCategory(id: $id, input: $input) {
      id
      name
      isActive
    }
  }
`;

export const KEYCLOAK_ROUTING_GROUPS_QUERY = /* GraphQL */ `
  query KeycloakRoutingGroups {
    keycloakRoutingGroups {
      status
      message
      groups {
        id
        name
      }
    }
  }
`;

export const CREATE_CATEGORY_MUTATION = /* GraphQL */ `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
      isActive
      sortOrder
      subCategories {
        id
        code
        name
      }
    }
  }
`;

export const CREATE_SUB_CATEGORY_MUTATION = /* GraphQL */ `
  mutation CreateSubCategory($input: CreateSubCategoryInput!) {
    createSubCategory(input: $input) {
      id
      name
      isActive
      sortOrder
    }
  }
`;

export const ADMIN_SLA_THRESHOLDS_QUERY = /* GraphQL */ `
  query AdminSlaThresholds {
    adminSlaThresholds {
      id
      customerTier
      customerTierLabel
      priority
      resolutionMinutes
      resolutionLabel
      warningPercent
    }
  }
`;

export const CREATE_SLA_THRESHOLD_MUTATION = /* GraphQL */ `
  mutation CreateSlaThreshold($input: CreateSlaThresholdInput!) {
    createSlaThreshold(input: $input) {
      id
      customerTier
      customerTierLabel
      priority
      resolutionMinutes
      resolutionLabel
      warningPercent
    }
  }
`;

export const UPDATE_SLA_THRESHOLD_MUTATION = /* GraphQL */ `
  mutation UpdateSlaThreshold($id: ID!, $input: UpdateSlaThresholdInput!) {
    updateSlaThreshold(id: $id, input: $input) {
      id
      customerTier
      customerTierLabel
      priority
      resolutionMinutes
      resolutionLabel
      warningPercent
    }
  }
`;

export const DELETE_SLA_THRESHOLD_MUTATION = /* GraphQL */ `
  mutation DeleteSlaThreshold($id: ID!) {
    deleteSlaThreshold(id: $id)
  }
`;

export const ADMIN_CASE_STATUSES_QUERY = /* GraphQL */ `
  query AdminCaseStatuses {
    adminCaseStatuses {
      id
      code
      label
      sortOrder
      isTerminal
      isResolvedState
      isActive
      pausesSla
      isSystem
      customerLabel
      statusCategory
    }
  }
`;

export const ADMIN_STATUS_TRANSITIONS_QUERY = /* GraphQL */ `
  query AdminStatusTransitions {
    adminStatusTransitions {
      id
      isActive
      requiredPermission
      fromStatus {
        id
        code
        label
      }
      toStatus {
        id
        code
        label
      }
    }
  }
`;

export const CREATE_CASE_STATUS_MUTATION = /* GraphQL */ `
  mutation CreateCaseStatus($input: CreateCaseStatusInput!) {
    createCaseStatus(input: $input) {
      id
      code
      label
      sortOrder
      statusCategory
      pausesSla
      isActive
      isSystem
    }
  }
`;

export const UPDATE_CASE_STATUS_MUTATION = /* GraphQL */ `
  mutation UpdateCaseStatus($id: ID!, $input: UpdateCaseStatusInput!) {
    updateCaseStatus(id: $id, input: $input) {
      id
      code
      label
      sortOrder
      statusCategory
      pausesSla
      isActive
      isSystem
      customerLabel
    }
  }
`;

export const DEACTIVATE_CASE_STATUS_MUTATION = /* GraphQL */ `
  mutation DeactivateCaseStatus($id: ID!) {
    deactivateCaseStatus(id: $id)
  }
`;

export const UPSERT_STATUS_TRANSITION_MUTATION = /* GraphQL */ `
  mutation UpsertStatusTransition($input: UpsertStatusTransitionInput!) {
    upsertStatusTransition(input: $input) {
      id
      isActive
      fromStatus {
        id
        code
        label
      }
      toStatus {
        id
        code
        label
      }
    }
  }
`;

export const DEACTIVATE_STATUS_TRANSITION_MUTATION = /* GraphQL */ `
  mutation DeactivateStatusTransition($id: ID!) {
    deactivateStatusTransition(id: $id)
  }
`;

export const NOTIFICATIONS_QUERY = /* GraphQL */ `
  query Notifications($unreadOnly: Boolean, $limit: Int) {
    notifications(unreadOnly: $unreadOnly, limit: $limit) {
      id
      recipientUserId
      caseId
      type
      title
      body
      payloadJson
      isRead
      createdAt
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT_QUERY = /* GraphQL */ `
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const MARK_NOTIFICATION_READ_MUTATION = /* GraphQL */ `
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = /* GraphQL */ `
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export const REPORT_META = /* GraphQL */ `
  fragment ReportMetaFields on ReportMeta {
    generatedAt
    dateFrom
    dateTo
    auditRetentionDays
  }
`;

export const REPORT_WORKLOAD_QUERY = /* GraphQL */ `
  query ReportWorkloadSummary($filter: ReportFilterInput!) {
    reportWorkloadSummary(filter: $filter) {
      meta {
        ...ReportMetaFields
      }
      openCount
      unassignedCount
      oldestOpenAgeMinutes
      dueSoonCount
      byStatus {
        key
        label
        count
      }
      byPriority {
        key
        label
        count
      }
      byRoutingGroup {
        key
        label
        count
      }
      byAssignee {
        userId
        count
      }
      bySlaState {
        key
        label
        count
      }
    }
  }
  ${REPORT_META}
`;

export const REPORT_SLA_QUERY = /* GraphQL */ `
  query ReportSlaCompliance($filter: ReportFilterInput!) {
    reportSlaCompliance(filter: $filter) {
      meta {
        ...ReportMetaFields
      }
      currentAtRiskCount
      currentBreachedCount
      resolvedWithinSlaCount
      resolvedAfterSlaCount
      complianceRatePercent
      averageResolutionMinutes
      breachMixByPriority {
        key
        label
        count
      }
      breachMixByCustomerTier {
        key
        label
        count
      }
      breachMixByRoutingGroup {
        key
        label
        count
      }
      breachMixByAssignee {
        userId
        count
      }
    }
  }
  ${REPORT_META}
`;

export const REPORT_INTAKE_QUERY = /* GraphQL */ `
  query ReportIntakeRoutingMix($filter: ReportFilterInput!) {
    reportIntakeRoutingMix(filter: $filter) {
      meta {
        ...ReportMetaFields
      }
      createdCount
      interactionLinkedCount
      standaloneCount
      interactionLinkedRatePercent
      byDate {
        key
        label
        count
      }
      byCategory {
        key
        label
        count
      }
      bySubCategory {
        key
        label
        count
      }
      byRoutingGroup {
        key
        label
        count
      }
      byPriority {
        key
        label
        count
      }
      byCustomerTier {
        key
        label
        count
      }
    }
  }
  ${REPORT_META}
`;

export const REPORT_RECURRENCE_QUERY = /* GraphQL */ `
  query ReportCustomerRecurrence($filter: ReportFilterInput!) {
    reportCustomerRecurrence(filter: $filter) {
      meta {
        ...ReportMetaFields
      }
      recentCasesWindowHours
      customersWithMultipleCases
      byCustomerTier {
        key
        label
        count
      }
      rows {
        customerProfileId
        customerName
        customerTier
        caseCount
        openCaseCount
        interactionLinkedCount
        recentRecurrenceCount
      }
    }
  }
  ${REPORT_META}
`;

export const REPORT_THROUGHPUT_QUERY = /* GraphQL */ `
  query ReportTeamThroughput($filter: ReportFilterInput!) {
    reportTeamThroughput(filter: $filter) {
      meta {
        ...ReportMetaFields
      }
      totalClaims
      totalAutoAssignments
      totalReassignments
      totalResolutions
      totalReopens
      totalClosures
      byRoutingGroup {
        groupKey
        groupLabel
        openLoad
        claims
        autoAssignments
        reassignments
        resolutions
        reopens
        closures
        averageResolutionMinutes
      }
      byAssignee {
        userId
        openLoad
        claims
        resolutions
        averageResolutionMinutes
      }
    }
  }
  ${REPORT_META}
`;

export const RESOLVE_USER_DISPLAY_NAMES_QUERY = /* GraphQL */ `
  query ResolveUserDisplayNames($userIds: [String!]!) {
    resolveUserDisplayNames(userIds: $userIds) {
      userId
      username
      displayName
    }
  }
`;

export const SEARCH_USERS_QUERY = /* GraphQL */ `
  query SearchUsers($query: String!, $limit: Int) {
    searchUsers(query: $query, limit: $limit) {
      userId
      username
      displayName
    }
  }
`;

export const MENTION_TARGETS_QUERY = /* GraphQL */ `
  query MentionTargets($query: String, $limit: Int) {
    mentionTargets(query: $query, limit: $limit) {
      kind
      id
      label
      description
    }
  }
`;

export const WIDGET_CASE_FIELDS = /* GraphQL */ `
  fragment WidgetCaseFields on Case {
    id
    caseReferenceId
    title
    description
    priority
    customerProfileId
    categoryId
    subCategoryId
    assignedGroupId
    assignedUserId
    createdByUserId
    createdAt
    updatedAt
    resolutionDueAt
    resolvedAt
    closedAt
    slaState
    slaMinutesRemaining
    slaTimeLabel
    status {
      id
      code
      label
      statusCategory
      isTerminal
      isResolvedState
    }
    category {
      id
      code
      name
    }
    subCategory {
      id
      code
      name
    }
    conversations {
      id
      interactionId
      linkedAt
      customerName
      agentName
      channel
      summary
      summaryAt
      summarySource
    }
  }
`;

export const WIDGET_CASE_DETAIL_FIELDS = /* GraphQL */ `
  fragment WidgetCaseDetailFields on Case {
    ...WidgetCaseFields
    comments {
      id
      caseId
      authorUserId
      body
      createdAt
      updatedAt
      attachments {
        id
        caseId
        commentId
        externalFileId
        fileName
        mimeType
        sizeBytes
        mediaUrl
        createdAt
      }
    }
    attachments {
      id
      caseId
      commentId
      externalFileId
      fileName
      mimeType
      sizeBytes
      mediaUrl
      createdAt
    }
  }
  ${WIDGET_CASE_FIELDS}
`;

export const WIDGET_CUSTOMER_CASE_INSIGHT_QUERY = /* GraphQL */ `
  query WidgetCustomerCaseInsight($customerProfileId: String!) {
    customerCaseInsight(customerProfileId: $customerProfileId) {
      openCaseCount
      windowHours
      recentCases {
        ...WidgetCaseFields
      }
    }
  }
  ${WIDGET_CASE_FIELDS}
`;

export const WIDGET_CASES_FOR_INTERACTION_QUERY = /* GraphQL */ `
  query WidgetCasesForInteraction($interactionId: String!, $customerProfileId: String) {
    casesForInteraction(interactionId: $interactionId, customerProfileId: $customerProfileId) {
      ...WidgetCaseFields
    }
  }
  ${WIDGET_CASE_FIELDS}
`;

export const WIDGET_CREATE_CASE_MUTATION = /* GraphQL */ `
  mutation WidgetCreateCase($input: CreateCaseInput!) {
    createCase(input: $input) {
      ...WidgetCaseFields
    }
  }
  ${WIDGET_CASE_FIELDS}
`;

export const WIDGET_CASE_FOR_CUSTOMER_QUERY = /* GraphQL */ `
  query WidgetCaseForCustomer($id: ID!, $customerProfileId: String!) {
    caseForCustomer(id: $id, customerProfileId: $customerProfileId) {
      ...WidgetCaseDetailFields
    }
  }
  ${WIDGET_CASE_DETAIL_FIELDS}
`;

export const WIDGET_CASE_QUERY = /* GraphQL */ `
  query WidgetCase($id: ID!) {
    widgetCase(id: $id) {
      ...WidgetCaseDetailFields
    }
  }
  ${WIDGET_CASE_DETAIL_FIELDS}
`;

export const WIDGET_CASE_SEARCH_RESULT_FIELDS = /* GraphQL */ `
  fragment CaseSearchResultFields on CaseSearchResult {
    customerProfileId
    customerDisplayLabel
    matchesActiveCustomer
    case {
      ...WidgetCaseFields
    }
  }
  ${WIDGET_CASE_FIELDS}
`;

export const WIDGET_SEARCH_CUSTOMER_CASES_QUERY = /* GraphQL */ `
  query WidgetSearchCustomerCases(
    $customerProfileId: String!
    $query: String!
    $includeTerminal: Boolean
    $limit: Int
    $activeCustomerProfileId: String
  ) {
    searchCustomerCases(
      customerProfileId: $customerProfileId
      query: $query
      includeTerminal: $includeTerminal
      limit: $limit
      activeCustomerProfileId: $activeCustomerProfileId
    ) {
      ...CaseSearchResultFields
    }
  }
  ${WIDGET_CASE_SEARCH_RESULT_FIELDS}
`;

export const WIDGET_SEARCH_CASES_QUERY = /* GraphQL */ `
  query WidgetSearchCases(
    $query: String!
    $includeTerminal: Boolean
    $limit: Int
    $activeCustomerProfileId: String
  ) {
    searchCases(
      query: $query
      includeTerminal: $includeTerminal
      limit: $limit
      activeCustomerProfileId: $activeCustomerProfileId
    ) {
      ...CaseSearchResultFields
    }
  }
  ${WIDGET_CASE_SEARCH_RESULT_FIELDS}
`;

export const WIDGET_LINK_CONVERSATION_TO_CASE_MUTATION = /* GraphQL */ `
  mutation WidgetLinkConversationToCase($input: LinkConversationInput!) {
    linkConversationToCase(input: $input) {
      ...WidgetCaseDetailFields
    }
  }
  ${WIDGET_CASE_DETAIL_FIELDS}
`;

export const WIDGET_ADD_COMMENT_MUTATION = /* GraphQL */ `
  mutation WidgetAddComment($input: AddCommentInput!) {
    addComment(input: $input) {
      ...WidgetCaseDetailFields
    }
  }
  ${WIDGET_CASE_DETAIL_FIELDS}
`;

/** admin-statuses.component.ts gqlCombinedAdminQuery. */
export const ADMIN_STATUSES_PAGE_QUERY = /* GraphQL */ `
  query AdminStatusesPage {
    adminCaseStatuses {
      id
      code
      label
      sortOrder
      statusCategory
      pausesSla
      isActive
      isSystem
      customerLabel
    }
    adminStatusTransitions {
      id
      isActive
      fromStatus {
        id
        code
        label
      }
      toStatus {
        id
        code
        label
      }
    }
  }
`;
