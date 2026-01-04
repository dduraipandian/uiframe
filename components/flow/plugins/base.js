/**
 * FlowValidator plugin contract
 */
class FlowValidator {
    onConnectionAttempt({ outNodeId, inNodeId }) {
        return { valid: true };
    }

    onConnectionAdded({ outNodeId, inNodeId }) { }
    onConnectionRemoved({ outNodeId, inNodeId }) { }
}

export default FlowValidator;
