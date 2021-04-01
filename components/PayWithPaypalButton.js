import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { graphql } from '@apollo/client/react/hoc';
import { injectIntl } from 'react-intl';
import styled, { css } from 'styled-components';

import { getGQLV2FrequencyFromInterval } from '../lib/constants/intervals';
import { getEnvVar } from '../lib/env-utils';
import { API_V2_CONTEXT, gqlV2 } from '../lib/graphql/helpers';
import { getPaypal } from '../lib/paypal';

import LoadingPlaceholder from './LoadingPlaceholder';
import StyledButton from './StyledButton';

const PaypalButtonContainer = styled.div`
  ${props =>
    props.isLoading &&
    css`
      .paypal-buttons {
        display: none !important;
      }
    `}
`;

/**
 * Encapsulate Paypal button logic so we don't have to deal with refs in parent
 * components.
 */
class PayWithPaypalButton extends Component {
  static propTypes = {
    /** Total amount to pay in cents */
    totalAmount: PropTypes.number.isRequired,
    /** The currency used for this order */
    currency: PropTypes.string.isRequired,
    interval: PropTypes.string,
    isSubmitting: PropTypes.bool,
    /** Called when user authorize the payment with a payment method generated from PayPal data */
    onSuccess: PropTypes.func.isRequired,
    /** Called when user cancel paypal flow */
    onCancel: PropTypes.func,
    /** Called when an error is thrown during paypal flow */
    onError: PropTypes.func,
    /** Called when the button is clicked */
    onClick: PropTypes.func,
    /** Styles to apply to the button. See https://developer.paypal.com/docs/checkout/how-to/customize-button/#button-styles */
    style: PropTypes.shape({
      color: PropTypes.oneOf(['gold', 'blue', 'silver', 'white', 'black']),
      shape: PropTypes.oneOf(['pill', 'rect']),
      size: PropTypes.oneOf(['small', 'medium', 'large', 'responsive']),
      height: PropTypes.number,
      label: PropTypes.oneOf(['checkout', 'credit', 'pay', 'buynow', 'paypal', 'installment']),
      tagline: PropTypes.bool,
      layout: PropTypes.oneOf(['horizontal', 'vertical']),
      funding: PropTypes.shape({ allowed: PropTypes.array, disallowed: PropTypes.array }),
      fundingicons: PropTypes.bool,
    }),
    host: PropTypes.shape({
      id: PropTypes.string,
      legacyId: PropTypes.number,
      paypalClientId: PropTypes.string,
    }),
    collective: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
    }),
    tier: PropTypes.shape({ id: PropTypes.string }),
    data: PropTypes.object,
    intl: PropTypes.object,
    subscriptionStartDate: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.paypalTarget = React.createRef();
    this.state = { isLoading: true };
  }

  componentDidMount() {
    this.initialize();
  }

  componentDidUpdate(oldProps) {
    if (
      Boolean(this.props.interval) !== Boolean(oldProps.interval) ||
      Boolean(oldProps.data?.loading) !== Boolean(this.props.data?.loading) ||
      this.props.currency !== oldProps.currency
    ) {
      this.initialize();
    }
  }

  static defaultStyle = {
    color: 'blue',
    tagline: false,
    label: 'pay',
    shape: 'pill',
    layout: 'horizontal',
  };

  async initialize() {
    if (!this.state.isLoading) {
      this.setState({ isLoading: true });
    }

    // If using subscriptions, wait for to plan to be loaded
    if (this.props.interval && (this.props.data?.loading || !this.props.data?.paypalPlan)) {
      return;
    }

    const { host, currency } = this.props;
    const clientId = host.paypalClientId;
    const intent = this.props.interval ? 'subscription' : 'capture';
    const paypal = await getPaypal({ clientId, currency, intent });
    const options = this.getOptions();
    paypal.Buttons(options).render(this.paypalTarget.current);
    this.setState({ isLoading: false });
  }

  getOptions() {
    const options = {
      env: getEnvVar('PAYPAL_ENVIRONMENT'),
      style: { ...PayWithPaypalButton.defaultStyle, ...this.props.style },
    };

    /* eslint-disable camelcase */
    if (this.props.interval) {
      options.intent = 'subscription';
      options.createSubscription = (data, actions) => {
        return actions.subscription.create({
          plan_id: this.props.data.paypalPlan.id,
          start_time: this.props.subscriptionStartDate,
          application_context: {
            brand_name: `${this.props.collective.name} - Open Collective`,
            locale: this.props.intl.locale,
            shipping_preference: 'NO_SHIPPING',
            user_action: 'CONTINUE',
          },
        });
      };
      options.onApprove = data => {
        this.props.onSuccess({ subscriptionId: data.subscriptionID });
      };
    } else {
      options.intent = 'capture';
      options.createOrder = (data, actions) => {
        return actions.order.create({
          intent: 'CAPTURE',
          application_context: {
            brand_name: `${this.props.collective.name} - Open Collective`,
            locale: this.props.intl.locale,
            shipping_preference: 'NO_SHIPPING',
            user_action: 'CONTINUE',
          },
          purchase_units: [
            {
              amount: {
                value: (this.props.totalAmount / 100).toString(),
                currency_code: this.props.currency,
              },
            },
          ],
        });
      };
      options.onApprove = result => {
        this.props.onSuccess({ orderId: result.orderID });
      };
    }
    /* eslint-enable camelcase */

    return options;
  }

  render() {
    return (
      <PaypalButtonContainer data-cy="paypal-container" isLoading={this.state.isLoading || this.props.isSubmitting}>
        <div data-cy="paypal-target" ref={this.paypalTarget} />
        {this.state.isLoading ? (
          <LoadingPlaceholder height={(this.props.style?.height || 47) + 3} minWidth="70px" borderRadius={100} />
        ) : this.props.isSubmitting ? (
          <StyledButton
            height={(this.props.style?.height || 47) + 3}
            width="100%"
            buttonStyle="primary"
            background="#0070ba"
            loading
          />
        ) : null}
      </PaypalButtonContainer>
    );
  }
}

const paypalPlanQuery = gqlV2`
  query PaypalPlanQuery($account: AccountReferenceInput!, $tier: TierReferenceInput, $amount: AmountInput!, $frequency: ContributionFrequency!) {
    paypalPlan(account: $account, tier: $tier, amount: $amount, frequency: $frequency) {
      id
    }
  }
`;

const addPaypalPlan = graphql(paypalPlanQuery, {
  // We only need a plan if using an interval
  skip: props => !props.interval,
  options: props => ({
    context: API_V2_CONTEXT,
    variables: {
      account: { id: props.collective.id },
      tier: props.tier ? { id: props.tier.id } : null,
      frequency: getGQLV2FrequencyFromInterval(props.interval),
      amount: {
        valueInCents: props.totalAmount,
        currency: props.currency,
      },
    },
  }),
});

export default addPaypalPlan(injectIntl(PayWithPaypalButton));
