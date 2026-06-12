import ActivityKit
import MyModule
import SwiftUI
import WidgetKit

@main
struct TraderEdgeWidgets: WidgetBundle {
    var body: some Widget {
        TraderEdgeLiveActivity()
    }
}

struct TraderEdgeLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TraderEdgeAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(TEColor.base)
                .activitySystemActionForegroundColor(TEColor.gold)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    IslandStatusBlock(context: context)
                        .padding(.leading, 8)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("MISSION CLOCK")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(TEColor.muted)
                            .lineLimit(1)
                        MissionTimerText(state: context.state, fontSize: 9)
                            .foregroundColor(TEColor.gold)
                    }
                    .padding(.trailing, 8)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        DividerLine()

                        HStack(alignment: .top, spacing: 12) {
                            IslandMetric(label: "CURRENT FOCUS", value: context.state.currentFocus)
                            IslandMetric(label: "OBJECTIVE", value: context.state.objective)
                        }

                        ProgressRail(percent: context.state.sessionRemainingPercent)
                    }
                    .padding(.horizontal, 8)
                    .padding(.bottom, 2)
                }
            } compactLeading: {
                Circle()
                    .fill(statusColor(context.state.status))
                    .frame(width: 7, height: 7)
                    .padding(.leading, 6)
            } compactTrailing: {
                CompactMissionClockLabel(context: context)
            } minimal: {
                Circle()
                    .fill(statusColor(context.state.status))
                    .frame(width: 9, height: 9)
            }
        }
    }
}

struct CompactMissionClockLabel: View {
    let context: ActivityViewContext<TraderEdgeAttributes>

    var body: some View {
        MissionTimerText(state: context.state, fontSize: 10)
            .foregroundColor(TEColor.text)
            .minimumScaleFactor(0.62)
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 88, alignment: .trailing)
            .padding(.trailing, 6)
    }
}

struct MissionTimerText: View {
    let state: TraderEdgeAttributes.ContentState
    let fontSize: CGFloat

    var body: some View {
        Group {
            if let startedAt = missionStartedAtDate(state) {
                Text(startedAt, style: .timer)
            } else {
                Text(compactMissionLengthLabel(state, now: Date()))
            }
        }
        .font(.system(size: fontSize, weight: .heavy, design: .monospaced))
        .lineLimit(1)
        .monospacedDigit()
    }
}

struct LockScreenView: View {
    let context: ActivityViewContext<TraderEdgeAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .center, spacing: 8) {
                Text("TE")
                    .font(.system(size: 9, weight: .black))
                    .foregroundColor(TEColor.surface)
                    .frame(width: 24, height: 24)
                    .background(TEColor.gold)
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                Text("TRADER'S EDGE")
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(1)
                    .foregroundColor(TEColor.muted)
                    .lineLimit(1)
            }
            .padding(.bottom, 10)

            Text(context.state.objective.uppercased())
                .font(.system(size: 16, weight: .black))
                .tracking(0.5)
                .foregroundColor(TEColor.text)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .padding(.bottom, 6)

            Text(context.state.coachingMessage)
                .font(.system(size: 12, weight: .regular))
                .foregroundColor(TEColor.bodyText)
                .lineLimit(2)
                .minimumScaleFactor(0.75)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, 12)

            DividerLine()
                .padding(.bottom, 8)

            HStack(spacing: 6) {
                Text(context.state.sessionLabel.uppercased())
                Text("•")
                Text("\(context.state.sessionRemainingPercent)% LEFT")
            }
            .font(.system(size: 9, weight: .black))
            .tracking(1.5)
            .foregroundColor(TEColor.gold)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
        }
        .padding(16)
        .background(TEColor.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(TEColor.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct IslandStatusBlock: View {
    let context: ActivityViewContext<TraderEdgeAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("MISSION STATUS")
                .font(.system(size: 8, weight: .heavy))
                .foregroundColor(TEColor.muted)
                .lineLimit(1)

            HStack(spacing: 5) {
                Circle()
                    .fill(statusColor(context.state.status))
                    .frame(width: 7, height: 7)
                Text(statusLabel(context.state.status))
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundColor(TEColor.text)
                    .lineLimit(1)
            }
        }
    }
}

struct IslandMetric: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 8, weight: .heavy))
                .foregroundColor(TEColor.muted)
                .lineLimit(1)
            Text(value)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(TEColor.text)
                .lineLimit(2)
                .minimumScaleFactor(0.78)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ProgressRail: View {
    let percent: Int

    var body: some View {
        GeometryReader { proxy in
            let clamped = max(0, min(100, percent))
            let width = proxy.size.width * CGFloat(clamped) / 100

            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(TEColor.rail)
                    .frame(height: 4)
                Rectangle()
                    .fill(TEColor.gold)
                    .frame(width: width, height: 4)
            }
        }
        .frame(height: 4)
    }
}

struct DividerLine: View {
    var body: some View {
        Rectangle()
            .fill(TEColor.outline)
            .frame(height: 1)
    }
}

enum TEColor {
    static let base = Color(hex: "020617")
    static let surface = Color(hex: "1A1E1F")
    static let text = Color(hex: "F8FAFC")
    static let bodyText = Color(hex: "B0B5B8")
    static let muted = Color(hex: "9A8F80")
    static let gold = Color(hex: "E9C176")
    static let border = Color(hex: "2A3135")
    static let rail = Color(hex: "323537")
    static let outline = Color(hex: "4E4639")
    static let risk = Color(hex: "FFB4AB")
    static let locked = Color(hex: "4D8DFF")
}

func statusColor(_ status: String) -> Color {
    switch status {
    case "locked_in":
        return TEColor.locked
    case "on_track":
        return TEColor.gold
    case "caution":
        return Color.yellow
    case "high_risk":
        return TEColor.risk
    default:
        return TEColor.gold
    }
}

func statusLabel(_ status: String) -> String {
    switch status {
    case "locked_in": return "LOCKED IN"
    case "on_track": return "ON TRACK"
    case "caution": return "CAUTION"
    case "high_risk": return "HIGH RISK"
    default: return status.replacingOccurrences(of: "_", with: " ").uppercased()
    }
}

func compactStatusLabel(_ status: String) -> String {
    switch status {
    case "locked_in": return "LOCKED"
    case "on_track": return "ON"
    case "caution": return "CAUTION"
    case "high_risk": return "RISK"
    default: return "LIVE"
    }
}

func compactMissionLengthLabel(_ state: TraderEdgeAttributes.ContentState, now: Date) -> String {
    if let startedAtMs = missionStartedAtMs(state) {
        return formatMissionElapsed(startedAtMs: startedAtMs, now: now)
    }

    let trimmed = state.timeRemaining
        .replacingOccurrences(of: " Remaining", with: "")
        .replacingOccurrences(of: " remaining", with: "")
        .trimmingCharacters(in: .whitespacesAndNewlines)

    if !trimmed.isEmpty {
        return trimmed.uppercased()
    }

    return "\(state.sessionRemainingPercent)% LEFT"
}

func missionStartedAtDate(_ state: TraderEdgeAttributes.ContentState) -> Date? {
    guard let startedAtMs = missionStartedAtMs(state) else {
        return nil
    }

    return Date(timeIntervalSince1970: startedAtMs / 1000)
}

func missionStartedAtMs(_ state: TraderEdgeAttributes.ContentState) -> Double? {
    if let startedAtMs = state.missionStartedAtMs {
        return startedAtMs
    }

    if state.timeRemaining.hasPrefix("missionElapsed:") {
        let rawValue = state.timeRemaining.replacingOccurrences(of: "missionElapsed:", with: "")
        if let startedAtMs = Double(rawValue) {
            return startedAtMs
        }
    }

    return nil
}

func formatMissionElapsed(startedAtMs: Double, now: Date) -> String {
    let elapsedSeconds = max(0, Int(now.timeIntervalSince1970 - (startedAtMs / 1000)))
    let hours = elapsedSeconds / 3600
    let minutes = (elapsedSeconds % 3600) / 60
    let seconds = elapsedSeconds % 60

    if hours > 0 {
        return "\(hours)H \(String(format: "%02d", minutes))M \(String(format: "%02d", seconds))S"
    }

    return "\(minutes)M \(String(format: "%02d", seconds))S"
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
