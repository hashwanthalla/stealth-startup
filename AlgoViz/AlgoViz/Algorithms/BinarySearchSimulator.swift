import Foundation

struct BinarySearchSimulator: AlgorithmSimulator {
    let initialValues: [Int]
    let target: Int

    init(values: [Int], target: Int) {
        self.initialValues = values.sorted()
        self.target = target
    }

    func generateSteps() -> [VisualizationStep] {
        var steps: [VisualizationStep] = [
            VisualizationStep(
                values: initialValues,
                message: "Binary search requires a sorted array. Looking for \(target)."
            )
        ]

        var left = 0
        var right = initialValues.count - 1

        while left <= right {
            let middle = left + (right - left) / 2
            let middleValue = initialValues[middle]

            steps.append(
                VisualizationStep(
                    values: initialValues,
                    message: "Search range [\(left), \(right)]. Check middle index \(middle) (value \(middleValue)).",
                    highlights: [middle],
                    highlightKind: .active(middle)
                )
            )

            if middleValue == target {
                steps.append(
                    VisualizationStep(
                        values: initialValues,
                        message: "Found \(target) at index \(middle).",
                        highlights: [middle],
                        highlightKind: .found(middle)
                    )
                )
                return steps
            }

            if middleValue < target {
                left = middle + 1
                steps.append(
                    VisualizationStep(
                        values: initialValues,
                        message: "\(middleValue) < \(target). Discard the left half.",
                        highlights: Set(left..<initialValues.count),
                        highlightKind: .range(left, right)
                    )
                )
            } else {
                right = middle - 1
                steps.append(
                    VisualizationStep(
                        values: initialValues,
                        message: "\(middleValue) > \(target). Discard the right half.",
                        highlights: Set(0...right),
                        highlightKind: .range(left, right)
                    )
                )
            }
        }

        steps.append(
            VisualizationStep(
                values: initialValues,
                message: "\(target) is not in the array.",
                highlights: [],
                highlightKind: .none
            )
        )

        return steps
    }
}
