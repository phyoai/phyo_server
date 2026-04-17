import { Response } from 'express';
import mongoose from 'mongoose';
import Influencer from '../models/influencer';
import UserList, { IUserListItem } from '../models/userList';
import { AuthenticatedRequest } from '../types';
import { sendError, sendSuccess } from '../utils/http';

const DEFAULT_ITEM_STATUS = 'Pending';
const LIST_ITEM_TYPE = 'influencer';

type ExportFormat = 'csv' | 'excel';

interface CreateListBody {
  name?: string;
  description?: string;
}

interface AddInfluencerInput {
  influencerId?: string;
  username?: string;
  status?: string;
  notes?: string;
}

interface AddInfluencersBody {
  influencerId?: string;
  username?: string;
  status?: string;
  notes?: string;
  influencerIds?: string[];
  influencers?: AddInfluencerInput[];
}

interface UpdateListInfluencerBody {
  status?: string;
  notes?: string;
}

interface BulkListInfluencerBody {
  action?: 'updateStatus' | 'remove';
  itemIds?: string[];
  status?: string;
}

type ListRecord = {
  _id: string | mongoose.Types.ObjectId;
  name: string;
  description?: string;
  items?: Array<IUserListItem | (IUserListItem & { _id?: mongoose.Types.ObjectId | string })>;
  createdAt?: Date;
  updatedAt?: Date;
};

type InfluencerRecord = {
  _id: mongoose.Types.ObjectId | string;
  user_name?: string;
  name?: string;
  profile_name?: string;
  profile_pic_url?: string;
  categoryInstagram?: string;
  city?: string;
  state?: string;
  language?: string;
  is_verified?: boolean;
  averageEngagement?: number;
  instagramData?: {
    followers?: number;
    avg_engagement?: number;
    link?: string;
  };
};

const getUserId = (req: AuthenticatedRequest, res: Response): string | null => {
  const userId = req.user?.id;

  if (!userId) {
    sendError(res, 401, 'Unauthorized');
    return null;
  }

  return userId;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeNotesValue = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return normalizeString(value);
};

const normalizeStatus = (value: unknown, fallback = DEFAULT_ITEM_STATUS): string => {
  const normalized = normalizeString(value);

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, 60);
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeFileName = (value: string): string => {
  const normalized = value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : 'list-export';
};

const isValidObjectId = (value: string): boolean => mongoose.Types.ObjectId.isValid(value);

const getListItemId = (item: IUserListItem | (IUserListItem & { _id?: mongoose.Types.ObjectId | string })): string => {
  const rawId = (item as any)?._id;
  return rawId ? String(rawId) : '';
};

const getItemStatusCounts = (items: Array<IUserListItem | (IUserListItem & { _id?: mongoose.Types.ObjectId | string })> = []): Record<string, number> => {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const status = normalizeStatus(item.status);
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {});
};

const buildListSummary = (list: ListRecord) => {
  const items = Array.isArray(list.items) ? list.items : [];

  return {
    id: String(list._id),
    name: list.name,
    description: list.description || '',
    totalInfluencers: items.length,
    statusCounts: getItemStatusCounts(items),
    createdAt: list.createdAt,
    updatedAt: list.updatedAt
  };
};

const pickInfluencerFields = (record: any): InfluencerRecord => ({
  _id: record._id,
  user_name: record.user_name,
  name: record.name,
  profile_name: record.profile_name,
  profile_pic_url: record.profile_pic_url,
  categoryInstagram: record.categoryInstagram,
  city: record.city,
  state: record.state,
  language: record.language,
  is_verified: record.is_verified,
  averageEngagement: record.averageEngagement,
  instagramData: {
    followers: record.instagramData?.followers,
    avg_engagement: record.instagramData?.avg_engagement,
    link: record.instagramData?.link
  }
});

const getInfluencerLookup = async (
  items: Array<IUserListItem | (IUserListItem & { _id?: mongoose.Types.ObjectId | string })>
): Promise<Map<string, InfluencerRecord>> => {
  const rawIdentifiers = Array.from(
    new Set(
      items
        .map((item) => normalizeString(item.itemId))
        .filter((value): value is string => Boolean(value))
    )
  );

  if (!rawIdentifiers.length) {
    return new Map<string, InfluencerRecord>();
  }

  const objectIds = rawIdentifiers.filter(isValidObjectId);
  const usernames = rawIdentifiers.filter((value) => !isValidObjectId(value));

  const [influencersById, influencersByUsername] = await Promise.all([
    objectIds.length
      ? Influencer.find({ _id: { $in: objectIds } })
          .select('_id user_name name profile_name profile_pic_url categoryInstagram city state language is_verified averageEngagement instagramData.followers instagramData.avg_engagement instagramData.link')
          .lean()
      : Promise.resolve([]),
    usernames.length
      ? Influencer.find({ user_name: { $in: usernames } })
          .select('_id user_name name profile_name profile_pic_url categoryInstagram city state language is_verified averageEngagement instagramData.followers instagramData.avg_engagement instagramData.link')
          .lean()
      : Promise.resolve([])
  ]);

  const lookup = new Map<string, InfluencerRecord>();

  [...influencersById, ...influencersByUsername].forEach((record: any) => {
    const influencer = pickInfluencerFields(record);
    lookup.set(String(record._id), influencer);

    if (record.user_name) {
      lookup.set(record.user_name, influencer);
    }
  });

  return lookup;
};

const buildListInfluencers = async (
  items: Array<IUserListItem | (IUserListItem & { _id?: mongoose.Types.ObjectId | string })> = []
) => {
  const lookup = await getInfluencerLookup(items);

  return items.map((item) => {
    const record = lookup.get(item.itemId) || null;
    const influencerId = record ? String(record._id) : item.itemId;

    return {
      id: getListItemId(item),
      influencerId,
      status: normalizeStatus(item.status),
      notes: item.notes || '',
      addedAt: item.addedAt,
      updatedAt: item.updatedAt || item.addedAt,
      influencer: record
        ? {
            id: String(record._id),
            username: record.user_name || '',
            name: record.name || '',
            profileName: record.profile_name || '',
            profilePicture: record.profile_pic_url || '',
            category: record.categoryInstagram || '',
            city: record.city || '',
            state: record.state || '',
            language: record.language || '',
            isVerified: Boolean(record.is_verified),
            followers: record.instagramData?.followers || 0,
            averageEngagement: record.instagramData?.avg_engagement ?? record.averageEngagement ?? 0,
            instagramUrl: record.instagramData?.link || ''
          }
        : null
    };
  });
};

const buildListDetail = async (list: ListRecord) => {
  const items = Array.isArray(list.items) ? list.items : [];

  return {
    ...buildListSummary(list),
    influencers: await buildListInfluencers(items)
  };
};

const parseAddInfluencerInputs = (body: AddInfluencersBody): AddInfluencerInput[] => {
  if (Array.isArray(body?.influencers) && body.influencers.length > 0) {
    return body.influencers;
  }

  if (Array.isArray(body?.influencerIds) && body.influencerIds.length > 0) {
    const sharedStatus = body.status;
    const sharedNotes = body.notes;
    return body.influencerIds.map((influencerId) => ({
      influencerId,
      status: sharedStatus,
      notes: sharedNotes
    }));
  }

  if (body?.influencerId || body?.username) {
    return [
      {
        influencerId: body.influencerId,
        username: body.username,
        status: body.status,
        notes: body.notes
      }
    ];
  }

  return [];
};

const resolveInfluencerInputs = async (inputs: AddInfluencerInput[]) => {
  const rawInfluencerIds = Array.from(
    new Set(
      inputs
        .map((input) => normalizeString(input.influencerId))
        .filter((value): value is string => Boolean(value))
    )
  );
  const influencerIds = rawInfluencerIds.filter(isValidObjectId);
  const usernames = Array.from(
    new Set(
      [
        ...inputs
          .map((input) => normalizeString(input.username))
          .filter((value): value is string => Boolean(value)),
        ...rawInfluencerIds.filter((value) => !isValidObjectId(value))
      ]
    )
  );

  const [influencersById, influencersByUsername] = await Promise.all([
    influencerIds.length
      ? Influencer.find({ _id: { $in: influencerIds.filter(isValidObjectId) } })
          .select('_id user_name name profile_name profile_pic_url categoryInstagram city state language is_verified averageEngagement instagramData.followers instagramData.avg_engagement instagramData.link')
          .lean()
      : Promise.resolve([]),
    usernames.length
      ? Influencer.find({ user_name: { $in: usernames } })
          .select('_id user_name name profile_name profile_pic_url categoryInstagram city state language is_verified averageEngagement instagramData.followers instagramData.avg_engagement instagramData.link')
          .lean()
      : Promise.resolve([])
  ]);

  const idLookup = new Map<string, any>();
  influencersById.forEach((record: any) => {
    idLookup.set(String(record._id), record);
  });

  const usernameLookup = new Map<string, any>();
  influencersByUsername.forEach((record: any) => {
    if (record.user_name) {
      usernameLookup.set(record.user_name, record);
    }
  });

  return inputs.map((input) => {
    const influencerId = normalizeString(input.influencerId);
    const username = normalizeString(input.username);

    const influencer =
      (influencerId ? idLookup.get(influencerId) : null) ||
      (influencerId && !isValidObjectId(influencerId) ? usernameLookup.get(influencerId) : null) ||
      (username ? usernameLookup.get(username) : null) ||
      null;

    return {
      input,
      influencer
    };
  });
};

const buildExportRows = (list: Awaited<ReturnType<typeof buildListDetail>>) => {
  return list.influencers.map((item) => ({
    'List Name': list.name,
    Username: item.influencer?.username || '',
    Name: item.influencer?.name || item.influencer?.profileName || '',
    Status: item.status,
    Notes: item.notes,
    Category: item.influencer?.category || '',
    Followers: item.influencer?.followers || 0,
    'Average Engagement': item.influencer?.averageEngagement || 0,
    City: item.influencer?.city || '',
    State: item.influencer?.state || '',
    Verified: item.influencer?.isVerified ? 'Yes' : 'No',
    'Added At': item.addedAt ? new Date(item.addedAt).toISOString() : '',
    'Updated At': item.updatedAt ? new Date(item.updatedAt).toISOString() : ''
  }));
};

const escapeCsvCell = (value: unknown): string => {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
};

const buildCsvContent = (rows: Array<Record<string, unknown>>): string => {
  if (!rows.length) {
    return 'List Name,Username,Name,Status,Notes,Category,Followers,Average Engagement,City,State,Verified,Added At,Updated At';
  }

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(','));

  return [headerLine, ...bodyLines].join('\n');
};

const escapeHtml = (value: unknown): string => {
  const normalized = value === null || value === undefined ? '' : String(value);
  return normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const buildExcelContent = (listName: string, rows: Array<Record<string, unknown>>): string => {
  const headers = rows.length
    ? Object.keys(rows[0])
    : ['List Name', 'Username', 'Name', 'Status', 'Notes', 'Category', 'Followers', 'Average Engagement', 'City', 'State', 'Verified', 'Added At', 'Updated At'];

  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const rowHtml = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(listName)}</title>
  </head>
  <body>
    <table border="1">
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowHtml}
      </tbody>
    </table>
  </body>
</html>`;
};

const loadOwnedList = async (userId: string, listId: string) => {
  if (!isValidObjectId(listId)) {
    return null;
  }

  return UserList.findOne({ _id: listId, userId });
};

export const getLists = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req, res);
    if (!userId) {
      return;
    }

    const lists = await UserList.find({ userId }).sort({ updatedAt: -1, createdAt: -1 }).lean();

    sendSuccess(
      res,
      'Lists retrieved successfully',
      {
        lists: lists.map((list: any) => buildListSummary(list)),
        emptyState: lists.length === 0
      }
    );
  } catch (error) {
    console.error('Get lists error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Server error');
  }
};

export const createList = async (
  req: AuthenticatedRequest<{}, {}, CreateListBody>,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req, res);
    if (!userId) {
      return;
    }

    const name = normalizeString(req.body?.name);
    const description = normalizeString(req.body?.description);

    if (!name) {
      sendError(res, 400, 'name is required');
      return;
    }

    const existingList = await UserList.findOne({
      userId,
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
    }).lean();

    if (existingList) {
      sendError(res, 409, 'A list with this name already exists');
      return;
    }

    const list = await UserList.create({
      userId,
      name,
      description,
      items: []
    });

    sendSuccess(
      res,
      'List created successfully',
      {
        list: buildListSummary(list.toObject() as ListRecord)
      },
      201
    );
  } catch (error) {
    console.error('Create list error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Server error');
  }
};

export const getListById = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req, res);
    if (!userId) {
      return;
    }

    const { id } = req.params;
    const list = await loadOwnedList(userId, id);

    if (!list) {
      sendError(res, 404, 'List not found');
      return;
    }

    sendSuccess(res, 'List retrieved successfully', {
      list: await buildListDetail(list.toObject() as ListRecord)
    });
  } catch (error) {
    console.error('Get list by id error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Server error');
  }
};

export const addListInfluencers = async (
  req: AuthenticatedRequest<{ id: string }, {}, AddInfluencersBody>,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req, res);
    if (!userId) {
      return;
    }

    const { id } = req.params;
    const list = await loadOwnedList(userId, id);

    if (!list) {
      sendError(res, 404, 'List not found');
      return;
    }

    const inputs = parseAddInfluencerInputs(req.body);

    if (!inputs.length) {
      sendError(res, 400, 'Provide influencerId, username, influencerIds, or influencers');
      return;
    }

    const resolvedInfluencers = await resolveInfluencerInputs(inputs);
    const existingInfluencerIds = new Set((list.items || []).map((item) => item.itemId));
    const skipped: Array<{ reference: string; reason: string }> = [];
    const added: Array<IUserListItem & { _id?: mongoose.Types.ObjectId | string }> = [];
    const now = new Date();

    resolvedInfluencers.forEach(({ input, influencer }) => {
      const reference = normalizeString(input.influencerId) || normalizeString(input.username) || 'unknown';

      if (!influencer) {
        skipped.push({ reference, reason: 'Influencer not found' });
        return;
      }

      const canonicalInfluencerId = String(influencer._id);

      if (existingInfluencerIds.has(canonicalInfluencerId)) {
        skipped.push({ reference, reason: 'Influencer already exists in this list' });
        return;
      }

      const item = {
        itemId: canonicalInfluencerId,
        itemType: LIST_ITEM_TYPE,
        status: normalizeStatus(input.status),
        notes: normalizeNotesValue(input.notes),
        addedAt: now,
        updatedAt: now
      };

      list.items.push(item as any);
      existingInfluencerIds.add(canonicalInfluencerId);
      added.push(item);
    });

    if (!added.length) {
      sendError(res, 400, 'No influencers were added', { skipped });
      return;
    }

    await list.save();

    const savedItems = list.items.slice(Math.max(list.items.length - added.length, 0));

    sendSuccess(
      res,
      'Influencers added successfully',
      {
        added: await buildListInfluencers(savedItems as any),
        skipped,
        list: buildListSummary(list.toObject() as ListRecord)
      },
      201
    );
  } catch (error) {
    console.error('Add list influencers error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Server error');
  }
};

export const updateListInfluencer = async (
  req: AuthenticatedRequest<{ id: string; itemId: string }, {}, UpdateListInfluencerBody>,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req, res);
    if (!userId) {
      return;
    }

    const list = await loadOwnedList(userId, req.params.id);

    if (!list) {
      sendError(res, 404, 'List not found');
      return;
    }

    const item = list.items.find((entry: any) => String(entry._id) === req.params.itemId);

    if (!item) {
      sendError(res, 404, 'Influencer entry not found');
      return;
    }

    const hasStatusUpdate = Object.prototype.hasOwnProperty.call(req.body, 'status');
    const hasNotesUpdate = Object.prototype.hasOwnProperty.call(req.body, 'notes');

    if (!hasStatusUpdate && !hasNotesUpdate) {
      sendError(res, 400, 'Provide status or notes to update');
      return;
    }

    if (hasStatusUpdate) {
      item.status = normalizeStatus(req.body.status, item.status || DEFAULT_ITEM_STATUS);
    }

    if (hasNotesUpdate) {
      item.notes = normalizeNotesValue(req.body.notes);
    }

    item.updatedAt = new Date();
    await list.save();

    const [updatedItem] = await buildListInfluencers([item]);

    sendSuccess(res, 'Influencer updated successfully', {
      item: updatedItem,
      list: buildListSummary(list.toObject() as ListRecord)
    });
  } catch (error) {
    console.error('Update list influencer error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Server error');
  }
};

export const bulkUpdateListInfluencers = async (
  req: AuthenticatedRequest<{ id: string }, {}, BulkListInfluencerBody>,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req, res);
    if (!userId) {
      return;
    }

    const list = await loadOwnedList(userId, req.params.id);

    if (!list) {
      sendError(res, 404, 'List not found');
      return;
    }

    const action = req.body?.action;
    const itemIds = Array.isArray(req.body?.itemIds)
      ? Array.from(
          new Set(
            req.body.itemIds
              .map((value) => normalizeString(value))
              .filter((value): value is string => Boolean(value))
          )
        )
      : [];

    if (!itemIds.length) {
      sendError(res, 400, 'itemIds is required');
      return;
    }

    if (!action || !['updateStatus', 'remove'].includes(action)) {
      sendError(res, 400, 'action must be updateStatus or remove');
      return;
    }

    const itemIdSet = new Set(itemIds);

    if (action === 'updateStatus') {
      const nextStatus = normalizeString(req.body?.status);

      if (!nextStatus) {
        sendError(res, 400, 'status is required for updateStatus');
        return;
      }

      let affectedCount = 0;
      const now = new Date();

      list.items.forEach((item: any) => {
        if (!itemIdSet.has(String(item._id))) {
          return;
        }

        item.status = normalizeStatus(nextStatus);
        item.updatedAt = now;
        affectedCount += 1;
      });

      if (!affectedCount) {
        sendError(res, 404, 'No matching influencer entries found');
        return;
      }

      await list.save();

      sendSuccess(res, 'Influencers updated successfully', {
        action,
        affectedCount,
        list: buildListSummary(list.toObject() as ListRecord)
      });
      return;
    }

    const initialCount = list.items.length;
    list.items = list.items.filter((item: any) => !itemIdSet.has(String(item._id))) as any;
    const affectedCount = initialCount - list.items.length;

    if (!affectedCount) {
      sendError(res, 404, 'No matching influencer entries found');
      return;
    }

    await list.save();

    sendSuccess(res, 'Influencers removed successfully', {
      action,
      affectedCount,
      list: buildListSummary(list.toObject() as ListRecord)
    });
  } catch (error) {
    console.error('Bulk update list influencers error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Server error');
  }
};

export const removeListInfluencer = async (
  req: AuthenticatedRequest<{ id: string; itemId: string }>,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req, res);
    if (!userId) {
      return;
    }

    const list = await loadOwnedList(userId, req.params.id);

    if (!list) {
      sendError(res, 404, 'List not found');
      return;
    }

    const initialCount = list.items.length;
    list.items = list.items.filter((item: any) => String(item._id) !== req.params.itemId) as any;

    if (list.items.length === initialCount) {
      sendError(res, 404, 'Influencer entry not found');
      return;
    }

    await list.save();

    sendSuccess(res, 'Influencer removed successfully', {
      list: buildListSummary(list.toObject() as ListRecord)
    });
  } catch (error) {
    console.error('Remove list influencer error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Server error');
  }
};

export const exportList = async (
  req: AuthenticatedRequest<{ id: string }, {}, {}, { format?: string }>,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req, res);
    if (!userId) {
      return;
    }

    const list = await loadOwnedList(userId, req.params.id);

    if (!list) {
      sendError(res, 404, 'List not found');
      return;
    }

    const formatParam = normalizeString(req.query?.format)?.toLowerCase();
    const format: ExportFormat | null =
      formatParam === 'csv'
        ? 'csv'
        : formatParam === 'excel' || formatParam === 'xlsx' || formatParam === 'xls'
          ? 'excel'
          : null;

    if (!format) {
      sendError(res, 400, 'format must be csv or excel');
      return;
    }

    const detail = await buildListDetail(list.toObject() as ListRecord);
    const rows = buildExportRows(detail);
    const fileName = sanitizeFileName(detail.name);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
      res.send(`\uFEFF${buildCsvContent(rows)}`);
      return;
    }

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xls"`);
    res.send(buildExcelContent(detail.name, rows));
  } catch (error) {
    console.error('Export list error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Server error');
  }
};

export const deleteList = async (
  req: AuthenticatedRequest<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req, res);
    if (!userId) {
      return;
    }

    if (!isValidObjectId(req.params.id)) {
      sendError(res, 404, 'List not found');
      return;
    }

    const deletedList = await UserList.findOneAndDelete({ _id: req.params.id, userId }).lean();

    if (!deletedList) {
      sendError(res, 404, 'List not found');
      return;
    }

    sendSuccess(res, 'List deleted successfully', {
      list: buildListSummary(deletedList as unknown as ListRecord)
    });
  } catch (error) {
    console.error('Delete list error:', error);
    sendError(res, 500, error instanceof Error ? error.message : 'Server error');
  }
};
