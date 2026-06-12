import ActivityKit
import Foundation

public struct TraderEdgeAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var missionId: String
        public var objective: String
        public var status: String
        public var threatsIdentified: Int
        public var timeRemaining: String

        public init(
            missionId: String,
            objective: String,
            status: String,
            threatsIdentified: Int,
            timeRemaining: String
        ) {
            self.missionId = missionId
            self.objective = objective
            self.status = status
            self.threatsIdentified = threatsIdentified
            self.timeRemaining = timeRemaining
        }
    }

    public var title: String

    public init(title: String) {
        self.title = title
    }
}
