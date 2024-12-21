module.exports = {
    REPORT_TYPES: ['no_response', 'payment_issue', 'wrong_amount', 'other'],
    TRANSACTION_STATUSES: ['open', 'matched', 'proof_uploaded', 'completed', 'cancelled'],
    TRUST_SCORE: {
      INITIAL: 20,
      INCREMENT: 5
    }
  };