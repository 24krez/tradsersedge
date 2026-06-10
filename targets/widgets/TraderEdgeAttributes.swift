import ActivityKit
import Foundation

struct TraderEdgeAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties
        var missionId: String
        var objective: String
        var status: String // "on_track", "caution", "high_risk", "locked_in"
        var threatsIdentified: Int
        var timeRemaining: String
    }

    // Fixed non-changing properties about the activity
    var title: String
}
