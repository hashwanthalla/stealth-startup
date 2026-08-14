import java.util.*;

public class Graph {
    private final Map<Integer, List<Integer>> adjList = new HashMap<>();
    private final boolean directed;

    public Graph(boolean directed) {
        this.directed = directed;
    }

    // Add a vertex to the graph
    public void addVertex(int vertex) {
        adjList.putIfAbsent(vertex, new ArrayList<>());
    }

    // Add an edge between two vertices
    public void addEdge(int src, int dest) {
        addVertex(src);
        addVertex(dest);
        adjList.get(src).add(dest);
        if (!directed) {
            adjList.get(dest).add(src);
        }
    }

    // Breadth-First Search starting from a given vertex
    public List<Integer> bfs(int start) {
        List<Integer> visitedOrder = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();

        queue.add(start);
        visited.add(start);

        while (!queue.isEmpty()) {
            int current = queue.poll();
            visitedOrder.add(current);

            for (int neighbor : adjList.getOrDefault(current, Collections.emptyList())) {
                if (!visited.contains(neighbor)) {
                    visited.add(neighbor);
                    queue.add(neighbor);
                }
            }
        }
        return visitedOrder;
    }

    // Depth-First Search starting from a given vertex
    public List<Integer> dfs(int start) {
        List<Integer> visitedOrder = new ArrayList<>();
        Set<Integer> visited = new HashSet<>();
        dfsHelper(start, visited, visitedOrder);
        return visitedOrder;
    }

    private void dfsHelper(int current, Set<Integer> visited, List<Integer> visitedOrder) {
        visited.add(current);
        visitedOrder.add(current);

        for (int neighbor : adjList.getOrDefault(current, Collections.emptyList())) {
            if (!visited.contains(neighbor)) {
                dfsHelper(neighbor, visited, visitedOrder);
            }
        }
    }

    // Print adjacency list representation
    public void printGraph() {
        for (Map.Entry<Integer, List<Integer>> entry : adjList.entrySet()) {
            System.out.println(entry.getKey() + " -> " + entry.getValue());
        }
    }

    public static void main(String[] args) {
        Graph graph = new Graph(false); // undirected graph

        graph.addEdge(1, 2);
        graph.addEdge(1, 3);
        graph.addEdge(2, 4);
        graph.addEdge(3, 4);
        graph.addEdge(4, 5);

        System.out.println("Adjacency List:");
        graph.printGraph();

        System.out.println("\nBFS starting from vertex 1:");
        System.out.println(graph.bfs(1));

        System.out.println("\nDFS starting from vertex 1:");
        System.out.println(graph.dfs(1));
    }
}
