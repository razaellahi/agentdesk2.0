export interface PhonebookColumn {
  field: string;
  header: string;
  type?: string;
  key?: string;
  isPii?: boolean;
  isSearchAble?: boolean;
  channelTypes?: { name?: string }[] | string[];
}

export interface UserPreferenceDoc {
  _id?: string;
  user_Id?: string;
  pageSize?: number | null;
  columns?: PhonebookColumn[];
  sortOption?: { field?: string; sortOption?: string }[];
}

export interface SchemaAttr {
  _id?: string;
  key?: string;
  label?: string;
  type?: string;
  isPii?: boolean;
  isSearchAble?: boolean;
  isChannelIdentifier?: boolean;
  channelTypes?: { name?: string }[] | string[];
  sortOrder?: number;
}

export interface FilterRow {
  id: string;
  attributeName: string;
  filterCondition: string;
  filterValue: string | string[];
  filterOption: "AND" | "OR";
}

export interface SavedFilter {
  _id: string;
  filterName: string;
  filterQuery: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerDoc {
  _id?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | string[];
  email?: string | string[];
  labels?: { _id?: string; name?: string; colorCode?: string }[];
  isAnonymous?: boolean;
  [key: string]: unknown;
}

export type FilterQuery = Record<string, unknown>;
