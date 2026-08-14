import Foundation

struct BubbleSortSimulator: AlgorithmSimulator {
    let initialValues: [Int]

    init(values: [Int]) {
        self.initialValues = values
    }

    func generateSteps() -> [VisualizationStep] {
        var array = initialValues
        var steps: [VisualizationStep] = [
            VisualizationStep(
                values: array,
                message: "Starting bubble sort. Compare adjacent elements and swap when out of order."
            )
        ]

        guard array.count > 1 else { return steps }

        for pass in 0..<(array.count - 1) {
            var swapped = false

            for index in 0..<(array.count - pass - 1) {
                let next = index + 1
                steps.append(
                    VisualizationStep(
                        values: array,
                        message: "Compare \(array[index]) and \(array[next]).",
                        highlights: [index, next],
                        highlightKind: .compare(index, next)
                    )
                )

                if array[index] > array[next] {
                    let leftValue = array[index]
                    let rightValue = array[next]
                    array.swapAt(index, next)
                    swapped = true
                    steps.append(
                        VisualizationStep(
                            values: array,
                            message: "\(leftValue) > \(rightValue) — swap them.",
                            highlights: [index, next],
                            highlightKind: .active(index)
                        )
                    )
                } else {
                    steps.append(
                        VisualizationStep(
                            values: array,
                            message: "No swap needed. Move to the next pair.",
                            highlights: [index, next],
                            highlightKind: .compare(index, next)
                        )
                    )
                }
            }

            let sortedIndex = array.count - pass - 1
            steps.append(
                VisualizationStep(
                    values: array,
                    message: "End of pass \(pass + 1). \(array[sortedIndex]) is in its final position.",
                    highlights: [sortedIndex],
                    highlightKind: .sorted(sortedIndex)
                )
            )

            if !swapped {
                break
            }
        }

        steps.append(
            VisualizationStep(
                values: array,
                message: "Done! The array is fully sorted.",
                highlights: Set(array.indices),
                highlightKind: .none
            )
        )

        return steps
    }
}
