interface Filter {
  key: string;
  operator: string;
  value: string;
}

function escape(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

/** Inlined filter argument, matching unified-agent's GraphqlService. */
export function graphqlFilter(filters: Filter[], alternatives: Filter[][] = []): string {
  const items = filters
    .map(
      (filter) =>
        `{ key: "${escape(filter.key)}", operator: ${filter.operator}, value: "${escape(filter.value)}" }`,
    )
    .concat(
      alternatives
        .filter((group) => group.length)
        .map(
          (group) =>
            `{ or: [ ${group.map((filter) => `{ key: "${escape(filter.key)}", operator: ${filter.operator}, value: "${escape(filter.value)}" }`).join(", ")} ] }`,
        ),
    )
    .join(", ");
  return `filter: { and: [ ${items} ] }`;
}

export function searchActivitiesQuery(
  filters: Filter[],
  limit: number,
  offset: number,
  sort: { sortBy: "timestamp" | "activity.channelSession.customer.firstName"; sortOrder: "ASC" | "DESC" } = {
    sortBy: "timestamp",
    sortOrder: "DESC",
  },
): string {
  return `query SearchActivities {
    searchActivities(
      pagination: { limit: ${limit}, offset: ${offset} },
      sort: { sortBy: "${sort.sortBy}", sortOrder: ${sort.sortOrder} },
      ${graphqlFilter(filters)}
    ) {
      totalDocs
      docs {
        id
        timestamp
        activity {
          name
          channelSession { channelData { channelCustomerIdentifier } customer { _id firstName phoneNumber } }
          data
        }
      }
    }
  }`;
}

export function searchConversationsQuery(
  limit: number,
  offset: number,
  options: {
    filters?: Filter[];
    channels?: string[];
    sortBy?: "creationTime" | "endTime" | "durationInSeconds";
    sortOrder?: "ASC" | "DESC";
  } = {},
): string {
  const channelFilters =
    options.channels?.map((name) => ({
      key: "participants.participant.channel.name",
      operator: "equal_to",
      value: name,
    })) ?? [];
  return `query SearchConversations {
    searchConversations(
      pagination: { limit: ${limit}, offset: ${offset} },
      sort: { sortBy: "${options.sortBy ?? "creationTime"}", sortOrder: ${options.sortOrder ?? "DESC"} }
      ${options.filters?.length || channelFilters.length ? `, ${graphqlFilter(options.filters ?? [], [channelFilters])}` : ""}
    ) {
      totalDocs
      docs {
        id
        state
        conversationDirection
        creationTime
        endTime
        durationInSeconds
        customer { _id firstName phoneNumber }
      }
    }
  }`;
}
