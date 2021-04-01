import { gqlV2 } from '../../../lib/graphql/helpers';

import { collectiveNavbarFieldsFragment } from '../../collective-page/graphql/fragments';

export const recurringContributionsQuery = gqlV2/* GraphQL */ `
  query RecurringContributions($slug: String) {
    account(slug: $slug) {
      id
      slug
      name
      type
      settings
      imageUrl
      features {
        ...NavbarFields
      }
      orders(filter: OUTGOING, onlySubscriptions: true) {
        totalCount
        nodes {
          id
          nextChargeDate
          paymentMethod {
            id
            service
            type
          }
          amount {
            value
            valueInCents
            currency
          }
          status
          frequency
          tier {
            id
            name
          }
          totalDonations {
            value
            valueInCents
            currency
          }
          toAccount {
            id
            slug
            name
            type
            description
            tags
            imageUrl
            settings
            ... on AccountWithHost {
              host {
                id
                slug
                paypalClientId
              }
            }
            ... on Organization {
              host {
                id
                slug
                paypalClientId
              }
            }
          }
          platformContributionAmount {
            value
            valueInCents
          }
        }
      }
    }
  }
  ${collectiveNavbarFieldsFragment}
`;
