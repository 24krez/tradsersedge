import ActivityKit
import ExpoModulesCore
import Foundation

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TraderEdgeLiveActivity")

    AsyncFunction("startActivity") { (title: String, missionId: String, objective: String, status: String, threatsIdentified: Int, timeRemaining: String) -> String? in
        if #available(iOS 16.2, *) {
            let attributes = TraderEdgeAttributes(title: title)
            let contentState = TraderEdgeAttributes.ContentState(
                missionId: missionId,
                objective: objective,
                status: status,
                threatsIdentified: threatsIdentified,
                timeRemaining: timeRemaining
            )
            
            do {
                let activity = try Activity.request(attributes: attributes, content: .init(state: contentState, staleDate: nil))
                return activity.id
            } catch {
                print("Error starting Live Activity: \(error.localizedDescription)")
                return nil
            }
        }
        return nil
    }

    AsyncFunction("updateActivity") { (activityId: String, missionId: String, objective: String, status: String, threatsIdentified: Int, timeRemaining: String) -> Bool in
        if #available(iOS 16.2, *) {
            let contentState = TraderEdgeAttributes.ContentState(
                missionId: missionId,
                objective: objective,
                status: status,
                threatsIdentified: threatsIdentified,
                timeRemaining: timeRemaining
            )
            
            Task {
                for activity in Activity<TraderEdgeAttributes>.activities where activity.id == activityId {
                    await activity.update(ActivityContent(state: contentState, staleDate: nil))
                }
            }
            return true
        }
        return false
    }

    AsyncFunction("endActivity") { (activityId: String) -> Bool in
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<TraderEdgeAttributes>.activities where activity.id == activityId {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
            }
            return true
        }
        return false
    }
  }
}
