import React from 'react';
import themeGet from '@styled-system/theme-get';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import styled from 'styled-components';

import Container from '../Container';
import { Box, Flex } from '../Grid';
import Illustration from '../home/HomeIllustration';
import { getI18nLink } from '../I18nFormatters';
import Link from '../Link';
import StyledButton from '../StyledButton';
import StyledHR from '../StyledHr';
import { H3, H4, H5, P, Span } from '../Text';

import { COLLECTIVE_ACCESS } from './constants';
import PlatformTip from './PlatformTip';

const ListWrapper = styled(Box)`
  list-style: none;
  padding-left: 0;
`;

const ListItem = styled.li`
  font-size: 13px;
  line-height: 16px;
  color: ${themeGet('colors.black.900')};
  margin-top: 15px;
  margin-bottom: 15px;
  background: url('/static/images/pricing/checkMark.svg') no-repeat left center;
  padding-left: 26px;

  @media screen and (min-width: 64em) {
    :first-of-type {
      margin-top: 0;
    }
  }
`;

const FeeData = styled(Span)`
  font-weight: 500;
  font-size: 15px;
  line-height: 22px;
  color: ${themeGet('colors.blue.700')};
  margin-right: 8px;
`;

const FeeDescription = styled(FeeData)`
  color: ${themeGet('colors.black.900')};
`;

const AccessToWrapper = styled(Container)`
  :nth-child(1),
  :nth-child(2) {
    margin-bottom: 46px;
  }
`;

const Card = styled(Container)`
  @media screen and (min-width: 52em) {
    width: 700px;
  }

  @media screen and (min-width: 64em) {
    width: 832px;
  }

  @media screen and (min-width: 88em) {
    width: 862px;
  }
`;

const messages = defineMessages({
  'pricing.collectivePage': {
    id: 'pricing.collectivePage',
    defaultMessage: 'Collective page',
  },
  'pricing.collectivePage.description': {
    id: 'pricing.collectivePage.description',
    defaultMessage:
      'A public page for your community to receive donations, manage expenses and keep in touch with your supporters, transparent by design.',
  },
  'pricing.outsideFunds': {
    id: 'pricing.outsideFunds',
    defaultMessage: 'Outside funds',
  },
  'pricing.outsideFunds.description': {
    id: 'pricing.accessTo.manuallyCredit',
    defaultMessage:
      "Manually credit Collective budgets with funds received outside the platform (e.g. payments you've invoiced, cash, or third party channels like a shop).",
  },
  'pricing.bankTransfer': {
    id: 'pricing.bankTransfer',
    defaultMessage: 'Bank transfer payments',
  },
  'pricing.bankTransfer.description': {
    id: 'pricing.accessTo.bankTransfer',
    defaultMessage:
      'Enable bank transfer payments to automatically provide financial contributors with wire instructions and a reference number for tracking.',
  },
  'pricing.creditCard': {
    id: 'pricing.creditCard',
    defaultMessage: 'Credit card processing',
  },
  'pricing.creditCard.description': {
    id: 'pricing.creditCard.description',
    defaultMessage:
      'Receive financial contributions to you via credit card, automatically updating your budget for transparent tracking. *Stripe fees apply',
  },
});

const displayPlatformTipBox = false;

const ForCollectiveCard = () => {
  const intl = useIntl();

  return (
    <Card padding={['24px', null, '32px']} width={['288px', '636px']} borderRadius="8px" border="1px solid #DCDEE0">
      <Flex justifyContent="center" alignItems="center" mb={['32px', '35px']}>
        <Box width="72px" height="72px" mr="16px">
          <Illustration src="/static/images/pricing/for-collective-illustration.png" alt="Collective Illustration" />
        </Box>
        <Box width={[null, '500px', '672px', null, '702px']}>
          <H3
            fontSize={['18px', '20px']}
            lineHeight={['26px', '28px']}
            color="black.900"
            fontWeight="500"
            letterSpacing={[null, '-0.008em']}
          >
            <FormattedMessage id="pricing.collectiveCard" defaultMessage="For Collectives" />
          </H3>
          <StyledHR my="8px" />
          <P fontSize="14px" lineHeight="20px" color="black.800">
            <FormattedMessage
              id="pricing.forCollective.description"
              defaultMessage="Bring your initiative to life in no time"
            />
          </P>
        </Box>
      </Flex>
      <Flex flexDirection={['column', 'row']} alignItems={['flex-start', null, 'center']}>
        <Container mr={[null, '41px', '72px']}>
          <H5
            fontSize={['18px', '20px']}
            lineHeight={['26px', '28px']}
            letterSpacing={[null, '-0.008em']}
            color="blue.700"
            mb="16px"
          >
            <FormattedMessage id="pricing.forCollective.fees.header" defaultMessage="We want to see you thrive" />
          </H5>
          <Box mb="16px">
            <Flex mb={3}>
              <FeeDescription>
                <FormattedMessage
                  id="pricing.platformFees"
                  defaultMessage="{fee} Platform Fees (on incoming contributions)"
                  values={{
                    fee: <FeeData>0$</FeeData>,
                  }}
                />{' '}
                ¹ ²
              </FeeDescription>
            </Flex>
            <Flex my={3}>
              <FeeDescription>
                <FormattedMessage
                  id="pricing.payoutFees"
                  defaultMessage="{fee} Payout Fees (on outgoing payments)"
                  values={{ fee: <FeeData>0$</FeeData> }}
                />{' '}
                ¹
              </FeeDescription>
            </Flex>
            <Flex my={3}>
              <FeeDescription>
                <FormattedMessage
                  id="pricing.forCollective.hostFees"
                  defaultMessage="{fee} apply depending on your host"
                  values={{ fee: <FeeData whiteSpace="nowrap">Host fees</FeeData> }}
                />
              </FeeDescription>
            </Flex>
          </Box>
          <P fontSize="12px" lineHeight="18px" color="black.700">
            (1){' '}
            <FormattedMessage
              id="pricing.notes.paymentProcessor"
              defaultMessage="Payment processor fees apply. See <stripeLink>stripe.com/pricing</stripeLink>, <paypalLink>paypal.com/pricing</paypalLink>, <transferwiseLink>transferwise.com/pricing</transferwiseLink>"
              values={{
                stripeLink: getI18nLink({
                  href: 'https://stripe.com/pricing',
                  openInNewTab: true,
                }),
                paypalLink: getI18nLink({
                  href: 'https://paypal.com/pricing',
                  openInNewTab: true,
                }),
                transferwiseLink: getI18nLink({
                  href: 'https://transferwise.com/pricing',
                  openInNewTab: true,
                }),
              }}
            />
          </P>
          <P fontSize="12px" lineHeight="18px" color="black.700" mt={2}>
            (2){' '}
            <FormattedMessage
              id="pricing.notes.platformFees"
              defaultMessage="Some Fiscal Hosts like the Open Source Collective are still applying Platform Fees for a limited time as they switch to the new pricing."
            />
          </P>
          {displayPlatformTipBox && (
            <PlatformTip width={[null, null, null, '451px']} minWidth={[null, null, '325px']} />
          )}
        </Container>
        <Box>
          <ListWrapper as="ul" mt={['32px', 0]}>
            <ListItem>
              <FormattedMessage id="pricing.fundraising" defaultMessage="Fundraising capabilities" />
            </ListItem>
            <ListItem>
              <FormattedMessage id="pricing.addFunds" defaultMessage="Manually add funds from other channels" />
            </ListItem>
            <ListItem>
              <FormattedMessage id="pricing.communicationTools" defaultMessage="Communication tools" />
            </ListItem>
            <ListItem>
              <FormattedMessage id="pricing.openFinance" defaultMessage="Transparency and open finances tools" />
            </ListItem>
            <ListItem>
              <FormattedMessage
                id="pricing.expensePayOuts"
                defaultMessage="Expense payouts in local currency with one-click using the TransferWise integration."
              />
            </ListItem>
          </ListWrapper>
          <Container display="flex" flexDirection={['column', null, null, null, 'row']}>
            <Link href="/create">
              <StyledButton
                buttonStyle="primary"
                width={['224px', '226px', null, '237px', '139px']}
                py="8px"
                my="8px"
                px={[null, null, '16px']}
                whiteSpace="nowrap"
                mr={[null, null, null, null, 2]}
              >
                <FormattedMessage id="collective.create" defaultMessage="Create Collective" />
              </StyledButton>
            </Link>
            <Link href="/hosts">
              <StyledButton
                buttonStyle="secondary"
                py="8px"
                px="16px"
                my="8px"
                whiteSpace="nowrap"
                width={['224px', '226px', null, '237px', '139px']}
              >
                <FormattedMessage id="pricing.findHost" defaultMessage="Find fiscal host" />
              </StyledButton>
            </Link>
          </Container>
        </Box>
      </Flex>
      <H4
        mt="40px"
        fontSize="12px"
        lineHeight="16px"
        letterSpacing="0.06em"
        color="black.900"
        textTransform="uppercase"
      >
        <FormattedMessage id="pricing.forCollective.accessTo" defaultMessage="You will also have access to" />
      </H4>
      <StyledHR mt="8px" />
      <Flex flexWrap="wrap" mt="32px" justifyContent="space-between">
        {COLLECTIVE_ACCESS.map(access => (
          <React.Fragment key={access}>
            <AccessToWrapper display="flex" flexDirection={['column', 'row', 'column']}>
              <Box
                mb="12px"
                width={access === 'collectivePage' ? '32px' : null}
                height={access === 'collectivePage' ? '32px' : null}
                mr={[null, '13px']}
              >
                <Illustration
                  src={`/static/images/pricing/${access}-icon.${access === 'collectivePage' ? 'png' : 'svg'}`}
                  alt="Icon"
                />
              </Box>
              <Box width={['112px', '230px', '176px']}>
                <H4 fontSize="15px" lineHeight="22px" color="black.900" fontWeight="500" mb="8px">
                  {intl.formatMessage(messages[`pricing.${access}`])}
                </H4>
                <P fontSize="13px" lineHeight="16px" color="black.900">
                  {intl.formatMessage(messages[`pricing.${access}.description`])}
                </P>
              </Box>
            </AccessToWrapper>
          </React.Fragment>
        ))}
      </Flex>
    </Card>
  );
};

export default ForCollectiveCard;
