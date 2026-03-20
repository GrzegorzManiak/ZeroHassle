import type { DeleteAllSpamResponse, IOutgoingMessage, Label } from '../../types';
import type { CreateDraftData } from '../schemas';
import type { IGetThreadResponse, MailManager, ManagerConfig, ParsedDraft } from './types';

const localLabels: Label[] = [
  { id: 'INBOX', name: 'INBOX', type: 'system' },
  { id: 'UNREAD', name: 'UNREAD', type: 'system' },
  { id: 'STARRED', name: 'STARRED', type: 'system' },
  { id: 'IMPORTANT', name: 'IMPORTANT', type: 'system' },
  { id: 'SENT', name: 'SENT', type: 'system' },
  { id: 'TRASH', name: 'TRASH', type: 'system' },
  { id: 'SPAM', name: 'SPAM', type: 'system' },
  { id: 'SNOOZED', name: 'SNOOZED', type: 'system' },
];

export class LocalMailManager implements MailManager {
  constructor(public config: ManagerConfig) {}

  async getMessageAttachments() {
    return [];
  }

  async get(): Promise<IGetThreadResponse> {
    return {
      messages: [],
      hasUnread: false,
      totalReplies: 0,
      labels: [],
    };
  }

  async create(_data: IOutgoingMessage) {
    return { id: crypto.randomUUID() };
  }

  async sendDraft(_id: string, _data: IOutgoingMessage) {}

  async createDraft(_data: CreateDraftData) {
    return { id: crypto.randomUUID(), success: true };
  }

  async getDraft(id: string): Promise<ParsedDraft> {
    return {
      id,
      to: [],
      cc: [],
      bcc: [],
      subject: '',
      content: '',
      rawMessage: { internalDate: new Date().toISOString() },
    };
  }

  async listDrafts() {
    return { threads: [], nextPageToken: null };
  }

  async delete(_id: string) {}

  async deleteDraft(_id: string) {}

  async list() {
    return { threads: [], nextPageToken: null };
  }

  async count() {
    return [];
  }

  async getTokens(_code: string) {
    return { tokens: {} };
  }

  async getUserInfo() {
    return {
      address: this.config.auth.email,
      name: this.config.auth.email.split('@')[0] || 'Local mailbox',
      photo: '',
    };
  }

  getScope() {
    return 'local:test';
  }

  async listHistory<T>(_historyId: string) {
    return { history: [] as T[], historyId: '' };
  }

  async markAsRead(_threadIds: string[]) {}

  async markAsUnread(_threadIds: string[]) {}

  normalizeIds(id: string[]) {
    return { threadIds: id };
  }

  async modifyLabels(_id: string[], _options: { addLabels: string[]; removeLabels: string[] }) {}

  async getAttachment(_messageId: string, _attachmentId: string) {
    return undefined;
  }

  async getUserLabels() {
    return localLabels;
  }

  async getLabel(id: string) {
    return (
      localLabels.find((label) => label.id === id) ?? {
        id,
        name: id,
        type: 'system',
      }
    );
  }

  async createLabel(_label: {
    name: string;
    color?: { backgroundColor: string; textColor: string };
  }) {}

  async updateLabel(
    _id: string,
    _label: { name: string; color?: { backgroundColor: string; textColor: string } },
  ) {}

  async deleteLabel(_id: string) {}

  async getEmailAliases() {
    return [
      {
        email: this.config.auth.email,
        name: this.config.auth.email.split('@')[0] || 'Local mailbox',
        primary: true,
      },
    ];
  }

  async revokeToken(_token: string) {
    return true;
  }

  async deleteAllSpam(): Promise<DeleteAllSpamResponse> {
    return {
      success: true,
      message: 'No spam to delete in the local mailbox.',
      count: 0,
    };
  }

  async getRawEmail(id: string) {
    return `Local mailbox message ${id}`;
  }
}
