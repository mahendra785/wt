"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

// Define types for our data
export interface Node extends d3.SimulationNodeDatum {
  id: number;
  name: string;
  category: string;
  path?: string;
  color?: string;
  content?: string;
  dependencies?: string[];
}

export interface Link {
  source: number | Node;
  target: number | Node;
  relation: string;
  strength?: number;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

// Utility functions for node lookup
const getNodeId = (node: number | Node): number =>
  typeof node === "object" ? node.id : node;

const getNodeById = (data: Node[], node: number | Node): Node | undefined => {
  if (typeof node === "number") {
    return data.find((n) => n.id === node);
  }
  return node;
};

interface ObsidianGraphProps {
  // Pass the GitHub URL (e.g., "username/repo") as a prop
  githubUrl: string;
}

const ObsidianGraph = ({ githubUrl }: ObsidianGraphProps) => {
  // State variables
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedFile, setSelectedFile] = useState<Node | null>(null);
  const [connectedNodes, setConnectedNodes] = useState<Node[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<{
    [key: string]: boolean;
  }>({
    page: true,
    layout: true,
    component: true,
    api: true,
    hook: true,
    util: true,
    config: true,
    styles: true,
    types: true,
    loading: true,
    error: true,
  });
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Fetch graph data from API using the provided GitHub URL
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        // Construct the full GitHub URL
        const fullUrl = `https://github.com/${githubUrl}`;
        const response = await fetch(
          "https://762e-128-185-112-57.ngrok-free.app/receive",
          {
            method: "POST",
            headers: {
              "Content-Type": "text/plain",
              Accept: "application/json",
            },
            body: `github_link=${fullUrl}`,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch graph data");
        }

        const data: GraphData = await response.json();
        // Add random colors to each node
        data.nodes = data.nodes.map((node) => ({
          ...node,
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        }));
        setGraphData(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch graph data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [githubUrl]);

  // Filter nodes based on category and search term
  const getFilteredNodes = (): Node[] => {
    if (!graphData || !graphData.nodes || !Array.isArray(graphData.nodes)) {
      return [];
    }

    return graphData.nodes.filter((node) => {
      if (!node || !node.category) return false;
      const passesCategory = categoryFilters[node.category] ?? true;
      const passesSearch =
        searchTerm === "" ||
        (node.name &&
          node.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (node.path &&
          node.path.toLowerCase().includes(searchTerm.toLowerCase()));
      return passesCategory && passesSearch;
    });
  };

  // Filter links based on visible nodes
  const getFilteredLinks = (): Link[] => {
    if (!graphData || !graphData.links || !Array.isArray(graphData.links)) {
      return [];
    }
    const filteredNodes = getFilteredNodes();
    const nodeIds = new Set(filteredNodes.map((node) => node.id));

    return graphData.links.filter((link) => {
      if (!link || link.source === undefined || link.target === undefined) {
        return false;
      }
      const sourceId = getNodeId(link.source);
      const targetId = getNodeId(link.target);
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
  };

  // Find connected nodes when a node is selected
  useEffect(() => {
    if (!selectedNode || !graphData) {
      setConnectedNodes([]);
      return;
    }

    const filteredLinks = getFilteredLinks();
    const connectedNodeIds = new Set<number>();

    filteredLinks.forEach((link) => {
      const sourceId = getNodeId(link.source);
      const targetId = getNodeId(link.target);

      if (sourceId === selectedNode.id) connectedNodeIds.add(targetId);
      if (targetId === selectedNode.id) connectedNodeIds.add(sourceId);
    });

    const connected = graphData.nodes.filter((node) =>
      connectedNodeIds.has(node.id)
    );
    setConnectedNodes(connected);
  }, [selectedNode, graphData, categoryFilters, searchTerm]);

  // D3 rendering
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !graphData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous rendering

    const container = svg.append("g");
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg
      .attr("width", width)
      .attr("height", height)
      .style("background", "#1e1e2e");

    // Add zoom functionality
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        container.attr("transform", event.transform.toString());
      });

    svg.call(zoom);
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8)
    );

    const filteredNodes = getFilteredNodes();
    const filteredLinks = getFilteredLinks();

    // Create force simulation
    const simulation = d3
      .forceSimulation<Node>(filteredNodes)
      .force("charge", d3.forceManyBody<Node>().strength(-300))
      .force("center", d3.forceCenter(0, 0))
      .force(
        "link",
        d3
          .forceLink<Node, Link>(filteredLinks)
          .id((d) => d.id)
          .distance((link) => {
            const sourceId = getNodeId(link.source);
            const targetId = getNodeId(link.target);
            const sourceNode = graphData.nodes.find((n) => n.id === sourceId);
            const targetNode = graphData.nodes.find((n) => n.id === targetId);

            if (
              sourceNode?.category === "config" ||
              targetNode?.category === "config"
            )
              return 180;
            if (
              sourceNode?.category === "types" ||
              targetNode?.category === "types"
            )
              return 150;
            return 120;
          })
      )
      .force("x", d3.forceX<Node>().strength(0.05))
      .force("y", d3.forceY<Node>().strength(0.05))
      .force("collision", d3.forceCollide<Node>().radius(30))
      .alphaDecay(0.01);

    // Create arrowhead marker
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -10 30 20")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 26)
      .attr("markerHeight", 20)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-10L20,0L0,10")
      .attr("fill", "#58A6FF");

    // Create curved links
    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll<SVGPathElement, Link>("path")
      .data(filteredLinks)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("stroke", "#58A6FF")
      .attr("stroke-width", 0.8)
      .attr("fill", "none")
      .style("opacity", 0.2)
      .attr("marker-end", "url(#arrowhead)");

    // Create nodes
    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, Node>("g.node")
      .data(filteredNodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(drag(simulation))
      .on("click", (event, d) => {
        event.stopPropagation();
        const clickedNode = graphData.nodes.find((n) => n.id === d.id) || null;
        setSelectedNode(clickedNode === selectedNode ? null : clickedNode);
        setSelectedFile(null);
      });

    // Add circles to nodes
    node
      .append("circle")
      .attr("r", (d) => {
        switch (d.category) {
          case "page":
          case "layout":
            return 8;
          case "component":
            return 7;
          case "api":
            return 8;
          case "config":
            return 9;
          default:
            return 6;
        }
      })
      .attr("fill", (d) => d.color || "#C9D1D9")
      .attr("stroke", (d) => (selectedNode?.id === d.id ? "#fff" : "#1e1e2e"))
      .attr("stroke-width", (d) => (selectedNode?.id === d.id ? 2 : 1.5));

    // Add labels to nodes
    node
      .append("text")
      .attr("dx", 10)
      .attr("dy", ".35em")
      .text((d) => {
        if (d.path && d.path !== "/") {
          const parts = `${d.path}${d.name}`.split("/");
          return parts[parts.length - 1];
        }
        return d.name;
      })
      .attr("fill", "#C9D1D9")
      .style("font-size", "10px")
      .style("pointer-events", "none");

    // Highlight connected nodes when selected
    if (selectedNode) {
      node.classed("highlighted", (n) => {
        return (
          n.id === selectedNode.id ||
          connectedNodes.some((cn) => cn.id === n.id)
        );
      });
      node.classed("faded", (n) => {
        return (
          n.id !== selectedNode.id &&
          !connectedNodes.some((cn) => cn.id === n.id)
        );
      });

      link.classed("highlighted", (l) => {
        const sourceId = getNodeId(l.source);
        const targetId = getNodeId(l.target);
        return sourceId === selectedNode.id || targetId === selectedNode.id;
      });
      link.classed("faded", (l) => {
        const sourceId = getNodeId(l.source);
        const targetId = getNodeId(l.target);
        return sourceId !== selectedNode.id && targetId !== selectedNode.id;
      });
    }

    simulation.on("tick", () => {
      // Update link positions with curved paths
      link.attr("d", (d) => {
        const sourceNode = getNodeById(filteredNodes, d.source);
        const targetNode = getNodeById(filteredNodes, d.target);

        const sourceX = sourceNode?.x ?? 0;
        const sourceY = sourceNode?.y ?? 0;
        const targetX = targetNode?.x ?? 0;
        const targetY = targetNode?.y ?? 0;

        // Check if there are multiple links between these nodes
        const multipleLinks = filteredLinks.filter((l) => {
          const s1 = getNodeId(l.source);
          const t1 = getNodeId(l.target);
          const s2 = getNodeId(d.source);
          const t2 = getNodeId(d.target);
          return (s1 === s2 && t1 === t2) || (s1 === t2 && t1 === s2);
        });

        if (multipleLinks.length > 1) {
          // Create a curved path
          const dx = targetX - sourceX;
          const dy = targetY - sourceY;
          const dr =
            Math.sqrt(dx * dx + dy * dy) * (1 + multipleLinks.indexOf(d) * 0.3);
          const sweep = 1;
          return `M${sourceX},${sourceY}A${dr},${dr} 0 0,${sweep} ${targetX},${targetY}`;
        } else {
          // Straight line for single links
          return `M${sourceX},${sourceY}L${targetX},${targetY}`;
        }
      });

      // Update node positions
      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, selectedNode, connectedNodes, categoryFilters, searchTerm]);

  // Drag behavior for nodes
  function drag(simulation: d3.Simulation<Node, Link>) {
    return d3
      .drag<SVGGElement, Node>()
      .on("start", (event: d3.D3DragEvent<SVGGElement, Node, Node>, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event: d3.D3DragEvent<SVGGElement, Node, Node>, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event: d3.D3DragEvent<SVGGElement, Node, Node>, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  // Toggle category filter
  const toggleCategoryFilter = (category: string) => {
    setCategoryFilters((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // Get color for category button
  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      page: "bg-blue-600",
      layout: "bg-blue-700",
      component: "bg-green-600",
      api: "bg-orange-600",
      hook: "bg-purple-600",
      util: "bg-red-600",
      config: "bg-gray-600",
      styles: "bg-pink-600",
      types: "bg-yellow-600",
      loading: "bg-blue-500",
      error: "bg-red-500",
    };

    return categoryFilters[category]
      ? colorMap[category] || "bg-gray-300"
      : "bg-gray-800";
  };

  // Handle file selection from connected nodes
  const handleFileSelect = (node: Node) => {
    setSelectedFile(node);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        Loading graph data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#1e1e2e] text-gray-200">
      {/* Header */}
      <header className="p-4 bg-gray-900 w-full">
        <div className="flex flex-col md:flex-row justify-between items-center mt-2 gap-3">
          <div className="flex flex-wrap gap-2">
            {graphData &&
              Array.from(
                new Set(graphData.nodes.map((node) => node.category))
              ).map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategoryFilter(category)}
                  className={`px-3 py-1 rounded text-xs ${getCategoryColor(
                    category
                  )}`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
          </div>
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 w-full"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* File System Panel */}
        <div className="md:w-1/4 w-full bg-gray-800 border-r border-gray-700 overflow-y-auto custom-scrollbar p-4">
          <h2 className="font-semibold mb-4">Project Files</h2>
          {selectedNode ? (
            <>
              <div className="mb-4 p-3 bg-gray-700 rounded">
                <h3 className="font-medium">{selectedNode.name}</h3>
                <div className="text-xs text-gray-400 mt-1">
                  {selectedNode.category}
                </div>
              </div>
              <h3 className="font-medium mb-2">Connected Files:</h3>
              <div className="space-y-2">
                {connectedNodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => handleFileSelect(node)}
                    className={`p-2 rounded cursor-pointer hover:bg-gray-700 ${
                      selectedFile?.id === node.id ? "bg-gray-700" : ""
                    }`}
                  >
                    <div className="font-medium">{node.name}</div>
                    <div className="text-xs text-gray-400">{node.category}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-gray-400 italic">
              Click on a node to see connected files
            </div>
          )}
        </div>

        {/* Code Explanation Panel */}
        <div className="md:w-1/3 w-full bg-gray-900 border-r border-gray-700 overflow-y-auto custom-scrollbar p-4">
          {selectedFile ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">{selectedFile.name}</h2>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="bg-gray-800 p-4 rounded font-mono text-sm whitespace-pre overflow-x-auto">
                {selectedFile.content}
              </div>
            </>
          ) : (
            <div className="text-gray-400 italic">
              Select a file to view its content
            </div>
          )}
        </div>

        {/* Graph Visualization Panel */}
        <div className="flex-1 bg-[#1e1e2e] overflow-hidden h-[300px] md:h-auto">
          <svg ref={svgRef} className="w-full h-full"></svg>
        </div>
      </div>
    </div>
  );
};

export default ObsidianGraph;
