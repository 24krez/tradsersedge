import ActivityKit
import MyModule
import SwiftUI
import WidgetKit

@main
struct TraderEdgeWidgets: WidgetBundle {
    var body: some Widget {
        TraderEdgeLiveActivity()
        TraderEdgeCoachingWidget()
    }
}

private let traderEdgeWidgetAppGroup = "group.com.24krez.traders-edge.expowidgets"
private let coachingWidgetKind = "TraderEdgeCoachingWidget"

struct TraderEdgeLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TraderEdgeAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(TEColor.base)
                .activitySystemActionForegroundColor(TEColor.gold)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        IslandHeaderRow(context: context)

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

struct IslandHeaderRow: View {
    let context: ActivityViewContext<TraderEdgeAttributes>

    var body: some View {
        HStack(alignment: .top) {
            IslandStatusBlock(context: context)

            Spacer(minLength: 12)

            VStack(alignment: .trailing, spacing: 2) {
                Text("MISSION CLOCK")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(TEColor.muted)
                    .lineLimit(1)

                ExpandedMissionTimerText(state: context.state)
                    .foregroundColor(TEColor.gold)
            }
        }
        .frame(maxWidth: .infinity)
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

struct ExpandedMissionTimerText: View {
    let state: TraderEdgeAttributes.ContentState

    var body: some View {
        Group {
            if let startedAt = missionStartedAtDate(state) {
                Text(timerInterval: startedAt...Date.distantFuture, countsDown: false)
            } else {
                Text(compactMissionLengthLabel(state, now: Date()))
            }
        }
        .font(.system(size: 9, weight: .heavy, design: .monospaced))
        .lineLimit(1)
        .monospacedDigit()
        .multilineTextAlignment(.trailing)
        .frame(width: 72, alignment: .trailing)
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

struct TraderEdgeCoachingWidget: Widget {
    let kind = coachingWidgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CoachingWidgetProvider()) { entry in
            CoachingWidgetView(entry: entry)
        }
        .configurationDisplayName("Trader's Edge Coaching")
        .description("Short discipline prompts for the Lock Screen.")
        .supportedFamilies([.accessoryRectangular, .accessoryCircular, .systemSmall])
    }
}

struct CoachingWidgetEntry: TimelineEntry {
    let date: Date
    let rectangularText: String
    let circularText: String
    let category: String
    let style: String
}

struct CoachingWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> CoachingWidgetEntry {
        CoachingWidgetEntry(
            date: Date(),
            rectangularText: "No setup, no trade.",
            circularText: "Rules first.",
            category: "tradingInsight",
            style: "direct"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (CoachingWidgetEntry) -> Void) {
        completion(entry(at: Date(), offset: 0))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CoachingWidgetEntry>) -> Void) {
        let now = Date()
        let entries = (0..<8).map { offset in
            entry(
                at: Calendar.current.date(byAdding: .minute, value: offset * refreshMinutes(for: now), to: now) ?? now,
                offset: offset
            )
        }
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: refreshMinutes(for: now) * 8, to: now) ?? now.addingTimeInterval(60 * 60)
        completion(Timeline(entries: entries, policy: .after(nextRefresh)))
    }

    private func entry(at date: Date, offset: Int) -> CoachingWidgetEntry {
        let cached = cachedMessage()
        let fallback = fallbackMessage(offset: offset, style: cached.style)
        let useCachedMessage = offset == 0 && !cached.rectangularText.isEmpty

        return CoachingWidgetEntry(
            date: date,
            rectangularText: rectangularSafe(useCachedMessage ? cached.rectangularText : fallback.rectangular),
            circularText: circularSafe(useCachedMessage ? cached.circularText : fallback.circular),
            category: cached.category.isEmpty ? fallback.category : cached.category,
            style: cached.style.isEmpty ? fallback.style : cached.style
        )
    }

    private func cachedMessage() -> (rectangularText: String, circularText: String, category: String, style: String) {
        guard let defaults = UserDefaults(suiteName: traderEdgeWidgetAppGroup) else {
            return ("", "", "", "")
        }

        return (
            defaults.string(forKey: "coachingWidget.rectangularText") ?? "",
            defaults.string(forKey: "coachingWidget.circularText") ?? "",
            defaults.string(forKey: "coachingWidget.category") ?? "",
            defaults.string(forKey: "coachingWidget.style") ?? ""
        )
    }

    private func fallbackMessage(offset: Int, style: String) -> (rectangular: String, circular: String, category: String, style: String) {
        let direct = [
            ("Do not chase.", "No chase."),
            ("Respect your stop.", "Respect risk."),
            ("No revenge trades.", "No revenge."),
            ("Stick to the plan.", "Plan first."),
            ("Wait. Confirm. Execute.", "Wait. Confirm."),
            ("Protect the account.", "Protect capital."),
        ]
        let calm = [
            ("No setup, no trade.", "Rules first."),
            ("Wait for confirmation.", "Wait. Confirm."),
            ("Protect capital first.", "Protect capital."),
            ("Patience is the edge.", "Stay patient."),
            ("Follow the mission.", "Mission first."),
            ("Process over outcome.", "Process first."),
        ]
        let bank = style == "calm" ? calm : direct
        let selected = bank[offset % bank.count]
        return (selected.0, selected.1, "tradingInsight", style.isEmpty ? "direct" : style)
    }

    private func refreshMinutes(for date: Date) -> Int {
        let hour = Calendar.current.component(.hour, from: date)
        if (8...16).contains(hour) {
            return 30
        }
        if (6...21).contains(hour) {
            return 60
        }
        return 180
    }
}

struct CoachingWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: CoachingWidgetEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            CircularCoachingWidget(entry: entry)
        case .systemSmall:
            HomeCoachingWidget(entry: entry)
        default:
            RectangularCoachingWidget(entry: entry)
        }
    }
}

struct RectangularCoachingWidget: View {
    let entry: CoachingWidgetEntry

    var body: some View {
        HStack(alignment: .center, spacing: 6) {
            Text("TE")
                .font(.system(size: 9, weight: .black))
                .foregroundColor(TEColor.gold)
                .frame(width: 18, height: 18)
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(TEColor.gold, lineWidth: 1)
                )

            Text(entry.rectangularText)
                .font(.system(size: 12, weight: .heavy))
                .foregroundColor(TEColor.text)
                .lineLimit(2)
                .minimumScaleFactor(0.78)
                .widgetAccentable()
        }
        .padding(.vertical, 4)
        .containerBackgroundIfAvailable()
    }
}

struct CircularCoachingWidget: View {
    let entry: CoachingWidgetEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Text("TE")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(TEColor.gold)
                Text(entry.circularText)
                    .font(.system(size: 9, weight: .heavy))
                    .foregroundColor(TEColor.text)
                    .lineLimit(2)
                    .minimumScaleFactor(0.65)
                    .multilineTextAlignment(.center)
            }
            .padding(4)
        }
        .containerBackgroundIfAvailable()
    }
}

struct HomeCoachingWidget: View {
    let entry: CoachingWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("TE")
                .font(.system(size: 11, weight: .black))
                .foregroundColor(TEColor.surface)
                .frame(width: 24, height: 24)
                .background(TEColor.gold)
                .clipShape(RoundedRectangle(cornerRadius: 6))

            Spacer(minLength: 0)

            Text(entry.rectangularText)
                .font(.system(size: 15, weight: .heavy))
                .foregroundColor(TEColor.text)
                .lineLimit(3)
                .minimumScaleFactor(0.82)

            Text("COACHING")
                .font(.system(size: 9, weight: .black))
                .tracking(1)
                .foregroundColor(TEColor.muted)
        }
        .padding(14)
        .containerBackgroundIfAvailable()
    }
}

extension View {
    @ViewBuilder
    func containerBackgroundIfAvailable() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(TEColor.surface, for: .widget)
        } else {
            self.background(TEColor.surface)
        }
    }
}

func rectangularSafe(_ text: String) -> String {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    let words = trimmed.split { $0.isWhitespace }
    guard !trimmed.isEmpty, words.count <= 12, trimmed.count <= 56 else {
        return "No setup, no trade."
    }
    return trimmed
}

func circularSafe(_ text: String) -> String {
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    let words = trimmed.split { $0.isWhitespace }
    guard !trimmed.isEmpty, words.count <= 6, trimmed.count <= 32 else {
        return "Rules first."
    }
    return trimmed
}
