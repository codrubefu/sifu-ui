import { getOrganizationByUrl, type ApiOrganization } from '../api/organizationApi';

let cachedOrganizationPromise: Promise<ApiOrganization> | null = null;
let cachedForOrigin: string | null = null;

export class OrganizationConfigService {
  private getOrganizationForCurrentUrl() {
    const currentOrigin = window.location.origin;

    if (!cachedOrganizationPromise || cachedForOrigin !== currentOrigin) {
      cachedForOrigin = currentOrigin;
      cachedOrganizationPromise = getOrganizationByUrl(currentOrigin).catch((error: unknown) => {
        cachedOrganizationPromise = null;
        cachedForOrigin = null;
        throw error;
      });
    }

    return cachedOrganizationPromise;
  }

  async getOrganizationIdForCurrentUrl() {
    const organization = await this.getOrganizationForCurrentUrl();
    const organizationId = organization?.id;

    if (organizationId === undefined || organizationId === null || organizationId === '') {
      throw new Error(`Nu exista organization_id configurat pentru ${window.location.origin}.`);
    }

    return organizationId;
  }

  async getOrganizationNameForCurrentUrl() {
    const organization = await this.getOrganizationForCurrentUrl();
    const organizationName = organization?.name;

    if (!organizationName) {
      throw new Error(`Nu exista organisation_name configurat pentru ${window.location.origin}.`);
    }

    return organizationName;
  }
}

export const organizationConfigService = new OrganizationConfigService();
