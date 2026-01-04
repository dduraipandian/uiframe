/**
 * FlowValidator plugin contract
 */
/* eslint-disable no-unused-vars */
class FlowValidator {
  onConnectionAttempt({ outNodeId, inNodeId }) {
    return { valid: true };
  }

  onConnectionAdded({ outNodeId, inNodeId }) {}
  onConnectionRemoved({ outNodeId, inNodeId }) {}
}

export default FlowValidator;
