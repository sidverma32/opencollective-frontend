const INTERVALS = {
  oneTime: 'oneTime',
  month: 'month',
  year: 'year',
  flexible: 'flexible',
};

export const getGQLV2FrequencyFromInterval = interval => {
  switch (interval) {
    case INTERVALS.month:
      return 'MONTHLY';
    case INTERVALS.year:
      return 'YEARLY';
    default:
      return 'ONETIME';
  }
};

export default INTERVALS;
