import ActivityKit
import ExpoModulesCore
import Foundation
import WidgetKit

private let traderEdgeWidgetAppGroup = "group.com.24krez.traders-edge.expowidgets"
private let coachingWidgetKind = "TraderEdgeCoachingWidget"

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TraderEdgeLiveActivity")

    AsyncFunction("startActivity") { (
        missionId: String,
        objective: String,
        currentFocus: String,
        status: String,
        threatsIdentified: Int,
        timeRemaining: String,
        sessionLabel: String,
        sessionRemainingPercent: Int,
        coachingMessage: String
    ) async -> String? in
        if #available(iOS 16.2, *) {
            let attributes = TraderEdgeAttributes(title: "Trader's Edge Mission")
            let missionTime = normalizedMissionTime(timeRemaining)
            let contentState = TraderEdgeAttributes.ContentState(
                missionId: missionId,
                objective: objective,
                currentFocus: currentFocus,
                primaryThreat: "No Threats",
                status: status,
                threatsIdentified: threatsIdentified,
                timeRemaining: missionTime.label,
                missionStartedAtMs: missionTime.startedAtMs,
                sessionLabel: sessionLabel,
                sessionRemainingPercent: sessionRemainingPercent,
                coachingMessage: coachingMessage
            )

            for activity in Activity<TraderEdgeAttributes>.activities {
                if activity.content.state.missionId == missionId {
                    await activity.update(ActivityContent(state: contentState, staleDate: nil))
                    return activity.id
                }

                await activity.end(nil, dismissalPolicy: .immediate)
            }
            
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

    AsyncFunction("updateActivity") { (
        activityId: String,
        missionId: String,
        objective: String,
        currentFocus: String,
        status: String,
        threatsIdentified: Int,
        timeRemaining: String,
        sessionLabel: String,
        sessionRemainingPercent: Int,
        coachingMessage: String
    ) async -> Bool in
        if #available(iOS 16.2, *) {
            let missionTime = normalizedMissionTime(timeRemaining)
            let contentState = TraderEdgeAttributes.ContentState(
                missionId: missionId,
                objective: objective,
                currentFocus: currentFocus,
                primaryThreat: "No Threats",
                status: status,
                threatsIdentified: threatsIdentified,
                timeRemaining: missionTime.label,
                missionStartedAtMs: missionTime.startedAtMs,
                sessionLabel: sessionLabel,
                sessionRemainingPercent: sessionRemainingPercent,
                coachingMessage: coachingMessage
            )
            
            for activity in Activity<TraderEdgeAttributes>.activities where activity.id == activityId {
                await activity.update(ActivityContent(state: contentState, staleDate: nil))
                return true
            }
        }
        return false
    }

    AsyncFunction("endActivity") { (activityId: String) async -> Bool in
        if #available(iOS 16.2, *) {
            var endedActivity = false
            for activity in Activity<TraderEdgeAttributes>.activities where activityId.isEmpty || activity.id == activityId || activity.content.state.missionId == activityId {
                await activity.end(nil, dismissalPolicy: .immediate)
                endedActivity = true
            }
            return endedActivity
        }
        return false
    }

    AsyncFunction("updateCoachingWidget") { (
        messageId: String,
        rectangularText: String,
        circularText: String,
        category: String,
        style: String,
        maxSurface: String,
        expiresAt: String
    ) async -> Bool in
        guard let defaults = UserDefaults(suiteName: traderEdgeWidgetAppGroup) else {
            return false
        }

        defaults.set(messageId, forKey: "coachingWidget.messageId")
        defaults.set(rectangularText, forKey: "coachingWidget.rectangularText")
        defaults.set(circularText, forKey: "coachingWidget.circularText")
        defaults.set(category, forKey: "coachingWidget.category")
        defaults.set(style, forKey: "coachingWidget.style")
        defaults.set(maxSurface, forKey: "coachingWidget.maxSurface")
        defaults.set(expiresAt, forKey: "coachingWidget.expiresAt")
        defaults.set(Date().timeIntervalSince1970, forKey: "coachingWidget.updatedAt")

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadTimelines(ofKind: coachingWidgetKind)
        }

        return true
    }
  }
}

private func normalizedMissionTime(_ timeRemaining: String) -> (label: String, startedAtMs: Double?) {
    let marker = "missionElapsed:"
    guard timeRemaining.hasPrefix(marker) else {
        return (timeRemaining, nil)
    }

    let rawValue = timeRemaining.replacingOccurrences(of: marker, with: "")
    guard let startedAtMs = Double(rawValue) else {
        return (timeRemaining, nil)
    }

    let elapsedSeconds = max(0, Int(Date().timeIntervalSince1970 - (startedAtMs / 1000)))
    return (formatMissionElapsed(seconds: elapsedSeconds), startedAtMs)
}

private func formatMissionElapsed(seconds: Int) -> String {
    let hours = seconds / 3600
    let minutes = (seconds % 3600) / 60
    let remainingSeconds = seconds % 60

    if hours > 0 {
        return "\(hours)H \(String(format: "%02d", minutes))M \(String(format: "%02d", remainingSeconds))S"
    }

    return "\(minutes)M \(String(format: "%02d", remainingSeconds))S"
}
