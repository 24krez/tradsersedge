import ActivityKit
import Foundation

public struct TraderEdgeAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var missionId: String
        public var objective: String
        public var currentFocus: String
        public var primaryThreat: String
        public var status: String
        public var threatsIdentified: Int
        public var timeRemaining: String
        public var sessionLabel: String
        public var sessionRemainingPercent: Int
        public var coachingMessage: String

        public init(
            missionId: String,
            objective: String,
            currentFocus: String,
            primaryThreat: String,
            status: String,
            threatsIdentified: Int,
            timeRemaining: String,
            sessionLabel: String,
            sessionRemainingPercent: Int,
            coachingMessage: String
        ) {
            self.missionId = missionId
            self.objective = objective
            self.currentFocus = currentFocus
            self.primaryThreat = primaryThreat
            self.status = status
            self.threatsIdentified = threatsIdentified
            self.timeRemaining = timeRemaining
            self.sessionLabel = sessionLabel
            self.sessionRemainingPercent = sessionRemainingPercent
            self.coachingMessage = coachingMessage
        }
    }

    public var title: String

    public init(title: String) {
        self.title = title
    }
}
