const hubspot = require("@hubspot/api-client");
const { queue } = require("async");
const _ = require("lodash");

const { filterNullValuesFromObject, goal } = require("./utils");
const Domain = require("./Domain");

const hubspotClient = new hubspot.Client({ accessToken: "" });

const PAGE_SIZE = 100;

const propertyPrefix = "hubspot__"; // todo: not used
let expirationDate;

const generateLastModifiedDateFilter = (date, nowDate, propertyName) => {
  const lastModifiedDateFilter = date
    ? {
        filters: [
          { propertyName, operator: "GTE", value: `${date.valueOf()}` },
          { propertyName, operator: "LTE", value: `${nowDate.valueOf()}` },
        ],
      }
    : {};

  return lastModifiedDateFilter;
};

const saveDomain = async (domain) => {
  // disable this for testing purposes
  return;

  domain.markModified("integrations.hubspot.accounts");
  await domain.save();
};

/**
 * Get access token from HubSpot
 */
const refreshHubspotAccessToken = async (account, tryCount) => {
  // todo: tryCount is never used
  const { HUBSPOT_CID, HUBSPOT_CS } = process.env;

  const { accessToken, refreshToken } = account;

  return hubspotClient.oauth.tokensApi
    .createToken(
      "refresh_token",
      undefined,
      undefined,
      HUBSPOT_CID,
      HUBSPOT_CS,
      refreshToken
    )
    .then(async (result) => {
      const body = result.body ? result.body : result;

      const newAccessToken = body.accessToken;
      expirationDate = new Date(body.expiresIn * 1000 + new Date().getTime());

      hubspotClient.setAccessToken(newAccessToken);
      if (newAccessToken !== accessToken) {
        account.accessToken = newAccessToken;
      }

      console.log("refreshing access token - success");

      return true;
    });
};

async function requestHubspotWithRetry(account, hubspotApiCallback) {
  let tryCount = 0;
  while (tryCount <= 4) {
    try {
      return await hubspotApiCallback();
    } catch (err) {
      console.error("requestHubspotWithRetry - fail", { err });
      tryCount++;

      if (new Date() > expirationDate) await refreshHubspotAccessToken(account);

      await new Promise((resolve, reject) =>
        setTimeout(resolve, 5000 * Math.pow(2, tryCount))
      );
    }
  }
}

async function processHubSpotPaginatedData(lastPulledDate, hubspotApiCallback) {
  let hasMore = true;
  const offsetObject = {};

  while (hasMore) {
    const lastModifiedDate = offsetObject.lastModifiedDate || lastPulledDate;

    console.log("processHubSpotPaginatedData - try", {
      offsetObject,
      lastModifiedDate,
    });

    const searchResult = await hubspotApiCallback(
      lastModifiedDate,
      offsetObject.after
    );

    offsetObject.after = parseInt(searchResult.paging?.next?.after);
    const data = searchResult.results || [];

    if (!offsetObject?.after) {
      hasMore = false;
      console.log("processHubSpotPaginatedData - end", { offsetObject });
      break;
    } else if (offsetObject?.after >= 9900) {
      offsetObject.after = 0;
      offsetObject.lastModifiedDate = new Date(
        data[data.length - 1].updatedAt
      ).valueOf();
      console.log("processHubSpotPaginatedData - more", { offsetObject });
    }
  }
}

/**
 * Get recently modified companies as 100 companies per page
 */
const processCompanies = async (account, q) => {
  const lastPulledDate = new Date(account.lastPulledDates.companies);
  const now = new Date();

  console.log("Companies date range:", {
    from: lastPulledDate.toISOString(),
    to: now.toISOString(),
  });

  await processHubSpotPaginatedData(
    lastPulledDate,
    async (lastModifiedDate, after) => {
      const lastModifiedDateFilter = generateLastModifiedDateFilter(
        lastModifiedDate,
        now,
        "hs_lastmodifieddate"
      );
      const searchObject = {
        filterGroups: [lastModifiedDateFilter],
        sorts: [
          { propertyName: "hs_lastmodifieddate", direction: "ASCENDING" },
        ],
        properties: [
          "name",
          "domain",
          "country",
          "industry",
          "description",
          "annualrevenue",
          "numberofemployees",
          "hs_lead_status",
        ],
        limit: PAGE_SIZE,
        after: after,
      };

      const searchResult = await requestHubspotWithRetry(account, async () => {
        console.log("try companies.searchApi.doSearch");
        return await hubspotClient.crm.companies.searchApi.doSearch(
          searchObject
        );
      });

      if (!searchResult)
        throw new Error(
          "Failed to fetch companies for the 4th time. Aborting."
        );

      const data = searchResult.results || [];

      console.log("fetch company batch");

      data.forEach((company) => {
        if (!company.properties) return;

        const actionTemplate = {
          includeInAnalytics: 0,
          companyProperties: {
            company_id: company.id,
            company_domain: company.properties.domain,
            company_industry: company.properties.industry,
          },
        };

        const isCreated =
          !lastPulledDate || new Date(company.createdAt) > lastPulledDate;

        q.push({
          actionName: isCreated ? "Company Created" : "Company Updated",
          actionDate:
            new Date(isCreated ? company.createdAt : company.updatedAt) - 2000,
          ...actionTemplate,
        });
      });

      return searchResult;
    }
  );

  account.lastPulledDates.companies = now;

  return true;
};

/**
 * Get recently modified contacts as 100 contacts per page
 */
const processContacts = async (account, q) => {
  const lastPulledDate = new Date(account.lastPulledDates.contacts);
  const now = new Date();

  console.log("Contacts date range:", {
    from: lastPulledDate.toISOString(),
    to: now.toISOString(),
  });

  await processHubSpotPaginatedData(
    lastPulledDate,
    async (lastModifiedDate, after) => {
      const lastModifiedDateFilter = generateLastModifiedDateFilter(
        lastModifiedDate,
        now,
        "lastmodifieddate"
      );
      const searchObject = {
        filterGroups: [lastModifiedDateFilter],
        sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
        properties: [
          "firstname",
          "lastname",
          "jobtitle",
          "email",
          "hubspotscore",
          "hs_lead_status",
          "hs_analytics_source",
          "hs_latest_source",
        ],
        limit: PAGE_SIZE,
        after: after,
      };

      const searchResult = await requestHubspotWithRetry(account, async () => {
        console.log("try contacts.searchApi.doSearch");
        return await hubspotClient.crm.contacts.searchApi.doSearch(
          searchObject
        );
      });

      if (!searchResult)
        throw new Error("Failed to fetch contacts for the 4th time. Aborting.");

      const data = searchResult.results || [];

      console.log("fetch contact batch");

      const contactIds = data.map((contact) => contact.id);

      // contact to company association
      const contactsToAssociate = contactIds;
      const companyAssociationsResults =
        (
          await (
            await hubspotClient.apiRequest({
              method: "post",
              path: "/crm/v3/associations/CONTACTS/COMPANIES/batch/read",
              body: {
                inputs: contactsToAssociate.map((contactId) => ({
                  id: contactId,
                })),
              },
            })
          ).json()
        )?.results || [];

      const companyAssociations = Object.fromEntries(
        companyAssociationsResults
          .map((a) => {
            if (a.from) {
              contactsToAssociate.splice(
                contactsToAssociate.indexOf(a.from.id),
                1
              );
              return [a.from.id, a.to[0].id];
            } else return false;
          })
          .filter((x) => x)
      );

      data.forEach((contact) => {
        if (!contact.properties || !contact.properties.email) return;

        const companyId = companyAssociations[contact.id];

        const isCreated = new Date(contact.createdAt) > lastPulledDate;

        const userProperties = {
          company_id: companyId,
          contact_name: (
            (contact.properties.firstname || "") +
            " " +
            (contact.properties.lastname || "")
          ).trim(),
          contact_title: contact.properties.jobtitle,
          contact_source: contact.properties.hs_analytics_source,
          contact_status: contact.properties.hs_lead_status,
          contact_score: parseInt(contact.properties.hubspotscore) || 0,
        };

        const actionTemplate = {
          includeInAnalytics: 0,
          identity: contact.properties.email,
          userProperties: filterNullValuesFromObject(userProperties),
        };

        q.push({
          actionName: isCreated ? "Contact Created" : "Contact Updated",
          actionDate: new Date(
            isCreated ? contact.createdAt : contact.updatedAt
          ),
          ...actionTemplate,
        });
      });

      return searchResult;
    }
  );

  account.lastPulledDates.contacts = now;

  return true;
};

/**
 * Get recently modified meetings as 100 meetings per page
 */
const processMeetings = async (account, q) => {
  const lastPulledDate = new Date(account.lastPulledDates.meetings);
  const now = new Date();

  console.log("Meeting date range:", {
    from: lastPulledDate,
    to: now.toISOString(),
  });

  await processHubSpotPaginatedData(
    lastPulledDate,
    async (lastModifiedDate, after) => {
      const lastModifiedDateFilter = generateLastModifiedDateFilter(
        lastModifiedDate,
        now,
        "hs_lastmodifieddate"
      );
      const searchObject = {
        filterGroups: [lastModifiedDateFilter],
        sorts: [
          { propertyName: "hs_lastmodifieddate", direction: "ASCENDING" },
        ],
        // hs_meeting_title, hs_meeting_body
        properties: [
          "hs_meeting_title",
          "hs_meeting_body",
          "hs_meeting_start_time",
          "hs_meeting_end_time",
          "hs_meeting_outcome",
        ],
        limit: PAGE_SIZE,
        after: after,
      };

      const searchResult = await requestHubspotWithRetry(account, async () => {
        // default returned properties:
        // hs_createdate,hs_lastmodifieddate,hs_object_id
        return await hubspotClient.crm.objects.meetings.searchApi.doSearch(
          searchObject
        );
      });

      if (!searchResult)
        throw new Error("Failed to fetch meetings for the 4th time. Aborting.");

      const meetings = searchResult.results || [];
      console.log(`Fetched ${meetings.length} meetings`);

      // Process each meeting to get associated contacts
      for (const meeting of meetings) {
        console.log(`Processing a meeting`, { meeting });
        // Get contact associations for this meeting
        const contactAssociationsResult = await requestHubspotWithRetry(
          account,
          async () => {
            return await hubspotClient.crm.objects.associationsApi.getAll(
              "meetings",
              meeting.id,
              "contacts"
            );
          }
        );

        const contactAssociations = contactAssociationsResult?.results || [];

        if (contactAssociations.length === 0) {
          console.log("Skip meetings with no contacts");
          continue; // Skip meetings with no contacts
        } else {
          console.log("contactAssociations", { contactAssociations });
        }

        // Get details for associated contacts to get their emails
        const contactIds = contactAssociations.map(
          (association) => association.id
        );

        const contactsDetailsResult = await requestHubspotWithRetry(
          account,
          async () => {
            console.log(`Get contact details for meeting ${meeting.id}`);
            return await hubspotClient.apiRequest({
              method: "post",
              path: "/crm/v3/objects/contacts/batch/read",
              body: {
                properties: ["email"],
                inputs: contactIds.map((id) => ({ id })),
              },
            });
          }
        );

        const contactsDetails = contactsDetailsResult?.results || [];

        // Create an action for each contact that attended the meeting
        for (const contact of contactsDetails) {
          if (!contact.properties || !contact.properties.email) continue;

          const isCreated = new Date(meeting.createdAt) > lastPulledDate;

          const meetingProperties = {
            meeting_id: meeting.id,
            meeting_title: meeting.properties.hs_meeting_title,
            meeting_start_time: meeting.properties.hs_meeting_start_time,
            meeting_end_time: meeting.properties.hs_meeting_end_time,
            meeting_outcome: meeting.properties.hs_meeting_outcome,
          };

          q.push({
            actionName: isCreated ? "Meeting Created" : "Meeting Updated",
            actionDate: new Date(
              isCreated ? meeting.createdAt : meeting.updatedAt
            ),
            identity: contact.properties.email,
            meetingProperties: filterNullValuesFromObject(meetingProperties),
            includeInAnalytics: 0,
          });
        }
      }

      return searchResult;
    }
  );

  account.lastPulledDates.meetings = now;

  return true;
};

const createQueue = (domain, actions) =>
  queue(async (action, callback) => {
    actions.push(action);

    if (actions.length > 2000) {
      console.log("inserting actions to database", {
        apiKey: domain.apiKey,
        count: actions.length,
      });

      const copyOfActions = _.cloneDeep(actions);
      actions.splice(0, actions.length);

      goal(copyOfActions);
    }

    callback();
  }, 100000000);

// todo: domain is not used
const drainQueue = async (domain, actions, q) => {
  if (q.length() > 0) await q.drain();

  if (actions.length > 0) {
    goal(actions);
  }

  return true;
};

const pullDataFromHubspot = async () => {
  console.log("start pulling data from HubSpot");

  const domain = await Domain.findOne({});

  for (const account of domain.integrations.hubspot.accounts) {
    console.log("start processing account");

    try {
      await refreshHubspotAccessToken(account);
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "refreshAccessToken" },
      });
    }

    const actions = [];
    const q = createQueue(domain, actions);

    try {
      console.log("start process contacts");
      // await processContacts(account, q);
      // await saveDomain(domain); // todo: mb can be done after all processing
      console.log("process contacts - done");
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "processContacts", hubId: account.hubId },
      });
    }

    try {
      console.log("start process companies");
      // await processCompanies(account, q);
      // await saveDomain(domain); // todo: mb can be done after all processing
      console.log("process companies - done");
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "processCompanies", hubId: account.hubId },
      });
    }

    try {
      console.log("start process meetings");
      await processMeetings(account, q);
      await saveDomain(domain);
      console.log("process meetings - done");
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "processMeetings", hubId: account.hubId },
      });
    }

    try {
      console.log("start drain queue");
      // todo: domain is not used here - who knows why?
      await drainQueue(domain, actions, q);
      console.log("drain queue - done");
    } catch (err) {
      console.log(err, {
        apiKey: domain.apiKey,
        metadata: { operation: "drainQueue", hubId: account.hubId },
      });
    }

    await saveDomain(domain);

    console.log("finish processing account");
  }

  process.exit();
};

module.exports = pullDataFromHubspot;
