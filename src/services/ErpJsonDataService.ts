import type { Announcement, Member, Payment, Service } from '../types/erp';

export type ActivityPoint = {
  day: string;
  active: number;
  messages: number;
};

export type ERPSeedData = {
  members: Member[];
  services: Service[];
  announcements: Announcement[];
  payments: Payment[];
  branches: string[];
  activity: ActivityPoint[];
};

export class ErpJsonDataService {
  private async readJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async loadSeedData(): Promise<ERPSeedData> {
    const [members, services, announcements, payments, branches, activity] = await Promise.all([
      this.readJson<Member[]>('/json/members.json'),
      this.readJson<Service[]>('/json/services.json'),
      this.readJson<Announcement[]>('/json/announcements.json'),
      this.readJson<Payment[]>('/json/payments.json'),
      this.readJson<string[]>('/json/branches.json'),
      this.readJson<ActivityPoint[]>('/json/activity.json'),
    ]);

    return {
      members,
      services,
      announcements,
      payments,
      branches,
      activity,
    };
  }
}

export const erpJsonDataService = new ErpJsonDataService();
