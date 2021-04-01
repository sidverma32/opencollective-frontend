import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@apollo/client';
import themeGet from '@styled-system/theme-get';
import { get, isEmpty } from 'lodash';
import { FormattedMessage } from 'react-intl';
import styled, { css } from 'styled-components';

import { API_V2_CONTEXT, gqlV2 } from '../../lib/graphql/helpers';

import Container from '../Container';
import { Box, Flex } from '../Grid';
import Loading from '../Loading';
import MessageBox from '../MessageBox';
import MessageBoxGraphqlError from '../MessageBoxGraphqlError';
import NewCreditCardForm from '../NewCreditCardForm';
import StyledRadioList from '../StyledRadioList';
import { P } from '../Text';
import { useUser } from '../UserProvider';

import BlockedContributorMessage from './BlockedContributorMessage';
import BraintreePaymentForm from './BraintreePaymentForm';
import { BRAINTREE_KEY, generatePaymentMethodOptions, NEW_CREDIT_CARD_KEY } from './utils';

const PaymentMethodBox = styled.div`
  display: flex;
  flex-direction: column;
  background: #ffffff;
  padding: 16px;

  ${props =>
    props.index &&
    css`
      border-top: 1px solid ${themeGet('colors.black.200')};
    `}
`;

const paymentMethodsQuery = gqlV2/* GraphQL */ `
  query ContributionFlowPaymentMethods($slug: String) {
    account(slug: $slug) {
      id
      paymentMethods(types: ["creditcard", "giftcard", "prepaid", "collective"], includeExpired: true) {
        id
        name
        data
        type
        expiryDate
        providerType
        sourcePaymentMethod {
          id
          name
          data
          type
          expiryDate
          providerType
          balance {
            currency
          }
          limitedToHosts {
            id
            legacyId
            slug
          }
        }
        balance {
          valueInCents
          currency
        }
        account {
          id
          slug
          type
          name
        }
        limitedToHosts {
          id
          legacyId
          slug
        }
      }
    }
  }
`;

const StepPayment = ({
  stepDetails,
  stepProfile,
  stepPayment,
  stepSummary,
  collective,
  onChange,
  hideCreditCardPostalCode,
  onNewCardFormReady,
  setBraintree,
  hasNewPaypal,
}) => {
  // GraphQL mutations and queries
  const { loading, data, error } = useQuery(paymentMethodsQuery, {
    variables: { slug: stepProfile.slug },
    context: API_V2_CONTEXT,
    skip: !stepProfile.id || stepProfile.contributorRejectedCategories,
    fetchPolicy: 'cache-and-network',
  });

  // data handling
  const { LoggedInUser } = useUser();
  const isRoot = Boolean(LoggedInUser?.isRoot());
  const paymentMethods = get(data, 'account.paymentMethods', null) || [];
  const paymentOptions = React.useMemo(
    () =>
      generatePaymentMethodOptions(
        paymentMethods,
        stepProfile,
        stepDetails,
        stepSummary,
        collective,
        isRoot,
        hasNewPaypal,
      ),
    [paymentMethods, stepProfile, stepDetails, collective, isRoot, hasNewPaypal],
  );

  const setNewPaymentMethod = (key, paymentMethod) => {
    onChange({ stepPayment: { key, paymentMethod } });
  };

  // Set default payment method
  useEffect(() => {
    if (!loading && !stepPayment && !isEmpty(paymentOptions)) {
      const firstOption = paymentOptions.find(pm => !pm.disabled);
      if (firstOption) {
        setNewPaymentMethod(firstOption.key, firstOption.paymentMethod);
      }
    }
  }, [paymentOptions, stepPayment, loading]);

  return (
    <Container width={1} border={['1px solid #DCDEE0', 'none']} borderRadius={15}>
      {stepProfile.contributorRejectedCategories ? (
        <BlockedContributorMessage categories={stepProfile.contributorRejectedCategories} collective={collective} />
      ) : loading && !paymentMethods.length ? (
        <Loading />
      ) : error ? (
        <MessageBoxGraphqlError error={error} />
      ) : !paymentOptions.length ? (
        <MessageBox type="warning" withIcon>
          <FormattedMessage
            id="NewContribute.noPaymentMethodsAvailable"
            defaultMessage="No payment methods available."
          />
        </MessageBox>
      ) : (
        <StyledRadioList
          id="PaymentMethod"
          name="PaymentMethod"
          keyGetter="key"
          options={paymentOptions}
          onChange={option => setNewPaymentMethod(option.key, option.value.paymentMethod)}
          value={stepPayment?.key || null}
        >
          {({ radio, checked, index, value }) => (
            <PaymentMethodBox index={index} disabled={value.disabled}>
              <Flex alignItems="center" css={value.disabled ? 'filter: grayscale(1) opacity(50%);' : undefined}>
                <Box as="span" mr={3} flexWrap="wrap">
                  {radio}
                </Box>
                <Flex mr={3} css={{ flexBasis: '26px' }}>
                  {value.icon}
                </Flex>
                <Flex flexDirection="column">
                  <P fontSize="15px" lineHeight="20px" fontWeight={400} color="black.900">
                    {value.title}
                  </P>
                  {value.subtitle && (
                    <P fontSize="12px" fontWeight={400} lineHeight="18px" color="black.500">
                      {value.subtitle}
                    </P>
                  )}
                </Flex>
              </Flex>
              {value.key === NEW_CREDIT_CARD_KEY && checked && (
                <Box my={3}>
                  <NewCreditCardForm
                    name={NEW_CREDIT_CARD_KEY}
                    profileType={get(stepProfile, 'type')}
                    hidePostalCode={hideCreditCardPostalCode}
                    onReady={onNewCardFormReady}
                    useLegacyCallback={false}
                    onChange={paymentMethod => setNewPaymentMethod(NEW_CREDIT_CARD_KEY, paymentMethod)}
                    error={get(stepPayment, 'paymentMethod.stripeData.error.message')}
                    defaultIsSaved={!stepProfile.isGuest}
                    hasSaveCheckBox={!stepProfile.isGuest}
                  />
                </Box>
              )}
              {value.key === 'manual' && checked && value.instructions && (
                <Box my={3} color="black.600" fontSize="14px">
                  {value.instructions}
                </Box>
              )}
              {value.key === BRAINTREE_KEY && checked && (
                <BraintreePaymentForm
                  collective={collective}
                  fromCollective={stepProfile}
                  onReady={setBraintree}
                  onChange={({ isReady }) => onChange({ stepPayment: { key: 'braintree', isReady } })}
                />
              )}
            </PaymentMethodBox>
          )}
        </StyledRadioList>
      )}
    </Container>
  );
};

StepPayment.propTypes = {
  collective: PropTypes.object,
  stepDetails: PropTypes.object,
  stepPayment: PropTypes.object,
  stepProfile: PropTypes.object,
  stepSummary: PropTypes.object,
  onChange: PropTypes.func,
  onNewCardFormReady: PropTypes.func,
  setBraintree: PropTypes.func,
  hideCreditCardPostalCode: PropTypes.bool,
  hasNewPaypal: PropTypes.bool,
};

StepPayment.defaultProps = {
  hideCreditCardPostalCode: false,
};

export default StepPayment;
