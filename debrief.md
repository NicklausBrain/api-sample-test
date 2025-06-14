### bugs

- `generateLastModifiedDateFilter` was defective, using non-working operators
- process termination on empty `searchResult` was never functional
- this piece looks very suspicious: `} else if (offsetObject?.after >= 9900) {`

### code quality

- it is bad and I had to do at least some refactoring to start working on the new function

#### what must be done

- maintainability would be greatly improved by migrating to typescript
- unused code and parameters must be purged
- get rid of magic numbers for pagination receive them as etl process config or input
  - overall configuration must be centralized and env variables should not be used directly
- create a facade class (or group of query classes) encapsulating Hubspot interop details
- retry policy should be extracted and be independent of Hubspot api
  - alternatively can be encapsulated in facade class hiding Hubspot interop details as well
- pure functions must be covered with unit tests
- the etl pipeline itself must be covered by integration tests
- error handling must be revised, and logging improved by using a dedicated logging library

### performance

- as of now i see no good reason why these 3 tasks are sequential:
  - `processContacts`, `processCompanies`, `processMeetings`
  - they can be either 3 separate etl pipelines or be run in parallel
- sequential processing of the internal data can likely be parallel as well (`data.forEach...`)
- i am not sure about the meaning of `await saveDomain(domain);` but it might be ok to do that in the very end of the etl process
- `const copyOfActions = _.cloneDeep(actions);` looks suspicious
- check if some sequential api calls can be replaced with batch api calls
- circuit breaker could be useful against cascading failures when HubSpot API is degraded

### result of the meetings processing:

```
start drain queue
[
  {
    actionName: 'Meeting Created',
    actionDate: 2023-02-17T06:30:45.471Z,
    identity: 'michael@company4.com',
    meetingProperties: {
      meeting_id: '15945419204',
      meeting_start_time: '2023-02-09T04:30:00Z',
      meeting_end_time: '2023-02-09T04:45:00Z',
      meeting_outcome: 'COMPLETED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-09T08:11:15.051Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16302144467',
      meeting_title: 'testestest',
      meeting_start_time: '2023-03-11T08:15:00Z',
      meeting_end_time: '2023-03-11T08:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-10T20:56:33.170Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16347010533',
      meeting_title: 'ezezezezez',
      meeting_start_time: '2023-03-10T21:00:00Z',
      meeting_end_time: '2023-03-10T21:30:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-11T02:46:08.603Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16347031258',
      meeting_title: 'Test completed meeting',
      meeting_start_time: '2023-03-11T03:00:00Z',
      meeting_end_time: '2023-03-11T03:30:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-11T02:43:05.384Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16347904981',
      meeting_title: 'Testing Meeting Creation',
      meeting_start_time: '2023-03-11T03:45:00Z',
      meeting_end_time: '2023-03-11T04:15:00Z',
      meeting_outcome: 'CANCELED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-11T22:21:18.457Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16351568878',
      meeting_title: 'future test 6',
      meeting_start_time: '2023-03-18T21:30:00Z',
      meeting_end_time: '2023-03-18T22:00:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-11T22:59:49.300Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16356442873',
      meeting_title: 'new ms property test',
      meeting_start_time: '2023-03-11T23:00:00Z',
      meeting_end_time: '2023-03-11T23:30:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-11T23:10:27.010Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16356440039',
      meeting_title: 'testing new ms date',
      meeting_start_time: '2023-03-11T23:15:00Z',
      meeting_end_time: '2023-03-11T23:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-11T23:13:33.842Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16356440257',
      meeting_title: 'testing new seconds date',
      meeting_start_time: '2023-03-11T23:15:00Z',
      meeting_end_time: '2023-03-11T23:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-15T22:02:58.293Z,
    identity: 'jennifer@company4.com',
    meetingProperties: {
      meeting_id: '16432210142',
      meeting_start_time: '2023-03-15T22:15:00Z',
      meeting_end_time: '2023-03-15T22:30:00Z'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-16T23:09:15.036Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16449263038',
      meeting_title: 'feedback meeting 1',
      meeting_start_time: '2023-03-18T23:15:00Z',
      meeting_end_time: '2023-03-18T23:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T03:07:34.866Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16452331498',
      meeting_title: 'feedback meeting 2',
      meeting_start_time: '2023-03-17T03:15:00Z',
      meeting_end_time: '2023-03-17T03:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T04:10:47.888Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16453996023',
      meeting_title: 'feedback meeting 3',
      meeting_start_time: '2023-03-17T04:15:00Z',
      meeting_end_time: '2023-03-17T04:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T04:29:09.859Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16453997260',
      meeting_title: 'feedback meeting 4',
      meeting_start_time: '2023-03-17T04:30:00Z',
      meeting_end_time: '2023-03-17T05:00:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T04:38:04.918Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16454343100',
      meeting_title: 'feedback meeting 5',
      meeting_start_time: '2023-03-17T04:45:00Z',
      meeting_end_time: '2023-03-17T05:15:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T04:46:41.228Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16454343408',
      meeting_title: 'meeting ignored until past start time',
      meeting_start_time: '2023-03-17T05:00:00Z',
      meeting_end_time: '2023-03-17T05:30:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T05:11:26.411Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16454000340',
      meeting_title: 'meeting ignored until past start time 2',
      meeting_start_time: '2023-03-17T05:15:00Z',
      meeting_end_time: '2023-03-17T05:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T05:19:30.871Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16455627455',
      meeting_title: 'final meeting attendance test',
      meeting_start_time: '2023-03-17T05:30:00Z',
      meeting_end_time: '2023-03-17T06:00:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T05:37:12.391Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16455684796',
      meeting_title: 'final meeting attendance test 2',
      meeting_start_time: '2023-03-17T05:45:00Z',
      meeting_end_time: '2023-03-17T06:15:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T05:50:30.206Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16454004433',
      meeting_title: 'final meeting attendance tetst 3',
      meeting_start_time: '2023-03-17T06:00:00Z',
      meeting_end_time: '2023-03-17T06:30:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T06:04:32.188Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16454644931',
      meeting_title: 'final reschedule attended test',
      meeting_start_time: '2023-03-17T06:15:00Z',
      meeting_end_time: '2023-03-17T06:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T07:43:56.683Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16456795343',
      meeting_title: 'testing new meeting bug',
      meeting_start_time: '2023-03-17T07:45:00Z',
      meeting_end_time: '2023-03-17T08:15:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T07:49:08.168Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16456831696',
      meeting_title: "testing arda's bug",
      meeting_start_time: '2023-03-17T08:15:00Z',
      meeting_end_time: '2023-03-17T08:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T08:18:32.976Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16457037808',
      meeting_title: 'testing new bug',
      meeting_start_time: '2023-03-17T08:30:00Z',
      meeting_end_time: '2023-03-17T09:00:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T08:28:11.214Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16457087713',
      meeting_title: "testing arda's bug 2",
      meeting_start_time: '2023-03-17T08:45:00Z',
      meeting_end_time: '2023-03-17T09:15:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-17T22:31:08.806Z,
    identity: 'jennifer@company4.com',
    meetingProperties: {
      meeting_id: '16472006592',
      meeting_start_time: '2023-03-17T22:45:00Z',
      meeting_end_time: '2023-03-17T23:00:00Z'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-18T07:36:11.116Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16483875566',
      meeting_title: 'timestamp comparison',
      meeting_start_time: '2023-03-18T08:00:00Z',
      meeting_end_time: '2023-03-18T08:30:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-19T22:41:51.519Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16494141927',
      meeting_title: 'testing action_date overhaul',
      meeting_start_time: '2023-03-19T22:45:00Z',
      meeting_end_time: '2023-03-19T23:15:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-19T23:05:54.857Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16494142938',
      meeting_title: 'final final test',
      meeting_start_time: '2023-03-19T23:15:00Z',
      meeting_end_time: '2023-03-19T23:45:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-19T23:38:52.072Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16494359753',
      meeting_title: 'second meeting test against query logic',
      meeting_start_time: '2023-03-19T23:45:00Z',
      meeting_end_time: '2023-03-20T00:15:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-03-19T23:38:04.709Z,
    identity: 'bh@hubspot.com',
    meetingProperties: {
      meeting_id: '16494528971',
      meeting_title: 'optimized attendance sql query',
      meeting_start_time: '2023-03-19T23:45:00Z',
      meeting_end_time: '2023-03-20T00:15:00Z',
      meeting_outcome: 'SCHEDULED'
    },
    includeInAnalytics: 0
  },
  {
    actionName: 'Meeting Created',
    actionDate: 2023-04-06T19:17:14.217Z,
    identity: 'jennifer@company4.com',
    meetingProperties: {
      meeting_id: '16838470090',
      meeting_start_time: '2023-04-06T19:17:08.379Z',
      meeting_end_time: '2023-04-06T19:32:08.379Z'
    },
    includeInAnalytics: 0
  }
]
```
