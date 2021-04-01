import React, { Fragment, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQuery } from '@apollo/client';
import { Lock } from '@styled-icons/boxicons-regular/Lock';
import themeGet from '@styled-system/theme-get';
import { first, get, merge, pick, uniqBy } from 'lodash';
import { withRouter } from 'next/router';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import styled from 'styled-components';

import { getErrorFromGraphqlException } from '../../lib/errors';
import { API_V2_CONTEXT, gqlV2 } from '../../lib/graphql/helpers';
import { getPaymentMethodName } from '../../lib/payment_method_label';
import { getPaymentMethodIcon, getPaymentMethodMetadata } from '../../lib/payment-method-utils';
import { getStripe, stripeTokenToPaymentMethod } from '../../lib/stripe';

import { Box, Flex } from '../Grid';
import I18nFormatters from '../I18nFormatters';
import LoadingPlaceholder from '../LoadingPlaceholder';
import { withStripeLoader } from '../StripeProvider';
import StyledButton from '../StyledButton';
import StyledHr from '../StyledHr';
import StyledRadioList from '../StyledRadioList';
import StyledRoundButton from '../StyledRoundButton';
import { P } from '../Text';
import { TOAST_TYPE, useToasts } from '../ToastProvider';

import AddPaymentMethod from './AddPaymentMethod';

const PaymentMethodBox = styled(Flex)`
  border-top: 1px solid ${themeGet('colors.black.300')};
`;

const messages = defineMessages({
  updatePaymentMethod: {
    id: 'subscription.menu.editPaymentMethod',
    defaultMessage: 'Update payment method',
  },
  addPaymentMethod: {
    id: 'subscription.menu.addPaymentMethod',
    defaultMessage: 'Add new payment method',
  },
});

const paymentMethodFragment = gqlV2/* GraphQL */ `
  fragment UpdatePaymentMethodFragment on PaymentMethod {
    id
    name
    data
    service
    type
    balance {
      value
      valueInCents
      currency
    }
    account {
      id
    }
  }
`;

const paymentMethodsQuery = gqlV2/* GraphQL */ `
  query UpdatePaymentMethodPopUpPaymentMethod($slug: String!, $orderId: String!) {
    account(slug: $slug) {
      id
      paymentMethods(types: ["creditcard", "giftcard", "prepaid"]) {
        ...UpdatePaymentMethodFragment
      }
    }
    order(order: { id: $orderId }) {
      id
      paymentMethod {
        ...UpdatePaymentMethodFragment
      }
    }
  }
  ${paymentMethodFragment}
`;

const updatePaymentMethodMutation = gqlV2/* GraphQL */ `
  mutation UpdatePaymentMethod(
    $order: OrderReferenceInput!
    $paymentMethod: PaymentMethodReferenceInput
    $paypalSubscriptionId: String
  ) {
    updateOrder(order: $order, paymentMethod: $paymentMethod, paypalSubscriptionId: $paypalSubscriptionId) {
      id
      status
      paymentMethod {
        id
      }
    }
  }
`;

const paymentMethodResponseFragment = gqlV2/* GraphQL */ `
  fragment paymentMethodResponseFragment on CreditCardWithStripeError {
    paymentMethod {
      id
    }
    stripeError {
      message
      response
    }
  }
`;

export const addCreditCardMutation = gqlV2/* GraphQL */ `
  mutation AddCreditCardRecurringContributions(
    $creditCardInfo: CreditCardCreateInput!
    $name: String!
    $account: AccountReferenceInput!
  ) {
    addCreditCard(creditCardInfo: $creditCardInfo, name: $name, account: $account) {
      ...paymentMethodResponseFragment
    }
  }
  ${paymentMethodResponseFragment}
`;

export const confirmCreditCardMutation = gqlV2/* GraphQL */ `
  mutation ConfirmCreditCardRecurringContributions($paymentMethod: PaymentMethodReferenceInput!) {
    confirmCreditCard(paymentMethod: $paymentMethod) {
      ...paymentMethodResponseFragment
    }
  }
  ${paymentMethodResponseFragment}
`;

const mutationOptions = { context: API_V2_CONTEXT };

const sortAndFilterPaymentMethods = (paymentMethods, contribution, addedPaymentMethod, existingPaymentMethod) => {
  if (!paymentMethods) {
    return null;
  }

  const minBalance = contribution.amount.valueInCents;
  const uniquePMs = uniqBy(paymentMethods, 'id');
  const getIsDisabled = pm => pm.balance.valueInCents < minBalance;

  // Make sure we always include the current payment method
  if (!uniquePMs.some(pm => pm.id === existingPaymentMethod.id)) {
    uniquePMs.unshift(existingPaymentMethod);
  }

  uniquePMs.sort((pm1, pm2) => {
    // Put disabled PMs at the end
    if (getIsDisabled(pm1) && !getIsDisabled(pm2)) {
      return 1;
    } else if (getIsDisabled(pm2) && !getIsDisabled(pm1)) {
      return -1;
    }

    // If we've just added a PM, put it at the top of the list
    if (addedPaymentMethod) {
      if (addedPaymentMethod.id === pm1.id) {
        return -1;
      } else if (addedPaymentMethod.id === pm2.id) {
        return 1;
      }
    }

    // Put the PM that matches this recurring contribution just after the newly added
    if (existingPaymentMethod.id === pm1.id) {
      return -1;
    } else if (existingPaymentMethod.id === pm2.id) {
      return 1;
    }

    return 0;
  });

  return uniquePMs.map(pm => ({
    key: `pm-${pm.id}`,
    title: getPaymentMethodName(pm),
    subtitle: getPaymentMethodMetadata(pm),
    icon: getPaymentMethodIcon(pm),
    paymentMethod: pm,
    disabled: getIsDisabled(pm),
    id: pm.id,
    CollectiveId: pm.account?.id,
  }));
};

const useUpdatePaymentMethod = contribution => {
  const { addToast } = useToasts();
  const [submitUpdatePaymentMethod, { loading: loadingUpdatePaymentMethod }] = useMutation(
    updatePaymentMethodMutation,
    mutationOptions,
  );

  return {
    loadingUpdatePaymentMethod,
    updatePaymentMethod: async paymentMethod => {
      const hasUpdate = paymentMethod.id !== contribution.paymentMethod.id;
      try {
        if (hasUpdate) {
          const variables = { order: { id: contribution.id } };
          if (paymentMethod.type === 'PAYPAL') {
            variables.paypalSubscriptionId = paymentMethod.paypalInfo.subscriptionId;
          } else {
            variables.paymentMethod = { id: paymentMethod.value ? paymentMethod.value.id : paymentMethod.id };
          }
          await submitUpdatePaymentMethod({ variables });
        }
        addToast({
          type: TOAST_TYPE.SUCCESS,
          message: (
            <FormattedMessage
              id="subscription.createSuccessUpdated"
              defaultMessage="Your recurring contribution has been <strong>updated</strong>."
              values={I18nFormatters}
            />
          ),
        });
      } catch (error) {
        const errorMsg = getErrorFromGraphqlException(error).message;
        addToast({ type: TOAST_TYPE.ERROR, message: errorMsg });
        return false;
      }
    },
  };
};

const UpdatePaymentMethodPopUp = ({ setMenuState, contribution, onCloseEdit, router, loadStripe, account }) => {
  const intl = useIntl();
  const { addToast } = useToasts();

  // state management
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [loadingSelectedPaymentMethod, setLoadingSelectedPaymentMethod] = useState(true);
  const [stripe, setStripe] = useState(null);
  const [newPaymentMethodInfo, setNewPaymentMethodInfo] = useState(null);
  const [addedPaymentMethod, setAddedPaymentMethod] = useState(null);
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);
  const { loadingUpdatePaymentMethod, updatePaymentMethod } = useUpdatePaymentMethod(contribution);

  // GraphQL mutations and queries
  const { data, refetch } = useQuery(paymentMethodsQuery, {
    variables: { slug: router.query.slug, orderId: contribution.id },
    context: API_V2_CONTEXT,
    fetchPolicy: 'network-only',
  });
  const [submitAddPaymentMethod] = useMutation(addCreditCardMutation, mutationOptions);
  const [submitConfirmPaymentMethodMutation] = useMutation(confirmCreditCardMutation, mutationOptions);

  const handleAddPaymentMethodResponse = async response => {
    const { paymentMethod, stripeError } = response;
    if (stripeError) {
      return handleStripeError(paymentMethod, stripeError);
    } else {
      return handleSuccess(paymentMethod);
    }
  };

  const handleStripeError = async (paymentMethod, stripeError) => {
    const { message, response } = stripeError;

    if (!response) {
      addToast({
        type: TOAST_TYPE.ERROR,
        message: message,
      });
      setAddingPaymentMethod(false);
      return false;
    }

    const stripe = await getStripe();
    const result = await stripe.handleCardSetup(response.setupIntent.client_secret);
    if (result.error) {
      addToast({
        type: TOAST_TYPE.ERROR,
        message: result.error.message,
      });
      setAddingPaymentMethod(false);
      return false;
    } else {
      try {
        const response = await submitConfirmPaymentMethodMutation({
          variables: { paymentMethod: { id: paymentMethod.id } },
        });
        return handleSuccess(response.data.confirmCreditCard.paymentMethod);
      } catch (error) {
        addToast({
          type: TOAST_TYPE.ERROR,
          message: error.message,
        });
        setAddingPaymentMethod(false);
        return false;
      }
    }
  };

  const handleSuccess = paymentMethod => {
    setAddingPaymentMethod(false);
    refetch();
    setAddedPaymentMethod(paymentMethod);
    setShowAddPaymentMethod(false);
    setLoadingSelectedPaymentMethod(true);
  };

  // load stripe on mount
  useEffect(() => {
    loadStripe();
  }, []);

  // data handling
  const paymentMethods = get(data, 'account.paymentMethods', null);
  const existingPaymentMethod = get(data, 'order.paymentMethod', null);
  const filterPaymentMethodsParams = [paymentMethods, contribution, addedPaymentMethod, existingPaymentMethod];
  const paymentOptions = React.useMemo(
    () => sortAndFilterPaymentMethods(...filterPaymentMethodsParams),
    filterPaymentMethodsParams,
  );

  useEffect(() => {
    if (paymentOptions && selectedPaymentMethod === null && contribution.paymentMethod) {
      setSelectedPaymentMethod(first(paymentOptions.filter(option => option.id === contribution.paymentMethod.id)));
      setLoadingSelectedPaymentMethod(false);
    } else if (paymentOptions && addedPaymentMethod) {
      setSelectedPaymentMethod(paymentOptions.find(option => option.id === addedPaymentMethod.id));
      setLoadingSelectedPaymentMethod(false);
    }
  }, [paymentOptions, addedPaymentMethod]);

  return (
    <Fragment>
      <Flex width={1} alignItems="center" justifyContent="center" minHeight={50} px={3}>
        <P my={2} fontSize="12px" textTransform="uppercase" color="black.700">
          {showAddPaymentMethod
            ? intl.formatMessage(messages.addPaymentMethod)
            : intl.formatMessage(messages.updatePaymentMethod)}
        </P>
        <Flex flexGrow={1} alignItems="center">
          <StyledHr width="100%" mx={2} />
        </Flex>
        {showAddPaymentMethod ? (
          <Lock size={20} />
        ) : (
          <StyledRoundButton
            size={24}
            onClick={() => setShowAddPaymentMethod(true)}
            data-cy="recurring-contribution-add-pm-button"
          >
            +
          </StyledRoundButton>
        )}
      </Flex>
      {showAddPaymentMethod ? (
        <Box px={1} pt={2} pb={3}>
          <AddPaymentMethod
            order={contribution}
            isSubmitting={loadingUpdatePaymentMethod}
            setNewPaymentMethodInfo={setNewPaymentMethodInfo}
            onStripeReady={({ stripe }) => setStripe(stripe)}
            onPaypalSuccess={async paypalPaymentMethod => {
              await updatePaymentMethod(paypalPaymentMethod);
              onCloseEdit();
            }}
          />
        </Box>
      ) : loadingSelectedPaymentMethod ? (
        <LoadingPlaceholder height={100} />
      ) : (
        <StyledRadioList
          id="PaymentMethod"
          name={`${contribution.id}-PaymentMethod`}
          keyGetter="key"
          options={paymentOptions}
          onChange={setSelectedPaymentMethod}
          value={selectedPaymentMethod?.key}
        >
          {({ radio, value: { title, subtitle, icon } }) => (
            <PaymentMethodBox minHeight={50} py={2} bg="white.full" data-cy="recurring-contribution-pm-box" px={3}>
              <Flex alignItems="center">
                <Box as="span" mr={3} flexWrap="wrap">
                  {radio}
                </Box>
                <Flex mr={2} css={{ flexBasis: '26px' }}>
                  {icon}
                </Flex>
                <Flex flexDirection="column" width="100%">
                  <P fontSize="12px" fontWeight={subtitle ? 600 : 400} color="black.900" overflowWrap="anywhere">
                    {title}
                  </P>
                  {subtitle && (
                    <P fontSize="12px" fontWeight={400} lineHeight="18px" color="black.500" overflowWrap="anywhere">
                      {subtitle}
                    </P>
                  )}
                </Flex>
              </Flex>
            </PaymentMethodBox>
          )}
        </StyledRadioList>
      )}
      <Flex flexGrow={1 / 4} width={1} alignItems="center" justifyContent="center">
        <Flex flexGrow={1} alignItems="center">
          <StyledHr width="100%" />
        </Flex>
      </Flex>
      <Flex flexGrow={1 / 4} width={1} alignItems="center" justifyContent="center" minHeight={50}>
        {showAddPaymentMethod ? (
          <Fragment>
            <StyledButton
              buttonSize="tiny"
              minWidth={75}
              onClick={() => {
                setShowAddPaymentMethod(false);
                setNewPaymentMethodInfo(null);
              }}
            >
              <FormattedMessage id="actions.cancel" defaultMessage="Cancel" />
            </StyledButton>
            <StyledButton
              ml={2}
              minWidth={75}
              buttonSize="tiny"
              buttonStyle="secondary"
              disabled={newPaymentMethodInfo ? !newPaymentMethodInfo.value?.complete : true}
              type="submit"
              loading={addingPaymentMethod}
              data-cy="recurring-contribution-submit-pm-button"
              onClick={async () => {
                setAddingPaymentMethod(true);
                if (!stripe) {
                  addToast({
                    type: TOAST_TYPE.ERROR,
                    message: (
                      <FormattedMessage
                        id="Stripe.Initialization.Error"
                        defaultMessage="There was a problem initializing the payment form. Please reload the page and try again."
                      />
                    ),
                  });
                  setAddingPaymentMethod(false);
                  return false;
                }
                const { token, error } = await stripe.createToken();

                if (error) {
                  addToast({ type: TOAST_TYPE.ERROR, message: error.message });
                  return false;
                }
                const newStripePaymentMethod = stripeTokenToPaymentMethod(token);
                const newCreditCardInfo = merge(newStripePaymentMethod.data, pick(newStripePaymentMethod, ['token']));
                try {
                  const res = await submitAddPaymentMethod({
                    variables: {
                      creditCardInfo: newCreditCardInfo,
                      name: get(newStripePaymentMethod, 'name'),
                      account: { id: account.id },
                    },
                  });
                  return handleAddPaymentMethodResponse(res.data.addCreditCard);
                } catch (error) {
                  const errorMsg = getErrorFromGraphqlException(error).message;
                  addToast({ type: TOAST_TYPE.ERROR, message: errorMsg });
                  setAddingPaymentMethod(false);
                  return false;
                }
              }}
            >
              <FormattedMessage id="save" defaultMessage="Save" />
            </StyledButton>
          </Fragment>
        ) : (
          <Fragment>
            <StyledButton
              buttonSize="tiny"
              minWidth={75}
              onClick={() => {
                setMenuState('mainMenu');
              }}
            >
              <FormattedMessage id="actions.cancel" defaultMessage="Cancel" />
            </StyledButton>
            <StyledButton
              ml={2}
              minWidth={75}
              buttonSize="tiny"
              buttonStyle="secondary"
              loading={loadingUpdatePaymentMethod}
              data-cy="recurring-contribution-update-pm-button"
              onClick={() => updatePaymentMethod(selectedPaymentMethod).then(onCloseEdit)}
            >
              <FormattedMessage id="subscription.updateAmount.update.btn" defaultMessage="Update" />
            </StyledButton>
          </Fragment>
        )}
      </Flex>
    </Fragment>
  );
};

UpdatePaymentMethodPopUp.propTypes = {
  data: PropTypes.object,
  setMenuState: PropTypes.func,
  router: PropTypes.object.isRequired,
  contribution: PropTypes.object.isRequired,
  onCloseEdit: PropTypes.func,
  loadStripe: PropTypes.func.isRequired,
  account: PropTypes.object.isRequired,
};

export default withStripeLoader(withRouter(UpdatePaymentMethodPopUp));
