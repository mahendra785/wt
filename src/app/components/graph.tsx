"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import Editor from "react-simple-code-editor";
import { Highlight as PrismHighlight } from "prism-react-renderer";
import { themes } from "prism-react-renderer";

// ------------------------------
// Type Definitions
// ------------------------------
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

interface AnalysisData {
  Summary: string;
  Redundancy: { Description: string; Files: string[] }[];
  LogicalErrors: { Description: string; File: string }[];
  SyntaxErrors: string[];
  Improvements: { Description: string; Suggestion: string }[];
}

interface ObsidianGraphProps {
  // GitHub URL as a prop (e.g., "username/repo")
  githubUrl: string;
}

// Additional interfaces for JS analysis report
interface CallDetail {
  name: string;
  line: number;
}

interface Transformation {
  file: string;
  line: number;
}

interface FunctionSymbol {
  name: string;
  startLine: number;
  endLine: number;
  calls: CallDetail[];
}

interface VariableSymbol {
  name: string;
  definedAtLine: number;
  transformations: Transformation[];
  usedInFiles: string[];
}

interface JSAnalysisReport {
  file: string;
  functions: FunctionSymbol[] | null;
  variables: VariableSymbol[] | null;
}

// ------------------------------
// Utility Functions
// ------------------------------
const getNodeId = (node: number | Node): number =>
  typeof node === "object" ? node.id : node;

const getNodeById = (data: Node[], node: number | Node): Node | undefined => {
  if (typeof node === "number") {
    return data.find((n) => n.id === node);
  }
  return node;
};

// ------------------------------
// Minimalistic UI Colors Function
// ------------------------------
const getCategoryColor = (category: string, active: boolean): string => {
  const colorMap: { [key: string]: string } = {
    page: "bg-blue-500",
    layout: "bg-blue-600",
    component: "bg-green-500",
    api: "bg-orange-500",
    hook: "bg-purple-500",
    util: "bg-red-500",
    config: "bg-gray-500",
    styles: "bg-pink-500",
    types: "bg-yellow-500",
    loading: "bg-indigo-500",
    error: "bg-red-600",
  };
  return active ? colorMap[category] || "bg-gray-400" : "bg-gray-700";
};

// ------------------------------
// ObsidianGraph Component
// ------------------------------
const ObsidianGraph = ({ githubUrl }: ObsidianGraphProps) => {
  // Graph data state
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Analysis summary state (from your original endpoint)
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<boolean>(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // JS Analysis report (functions/variables tracking) loaded from public/data.json
  const [analysis, setAnalysis] = useState<JSAnalysisReport[] | null>(null);

  // UI states for selection and filtering
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedFile, setSelectedFile] = useState<Node | null>(null);
  const [openedFiles, setOpenedFiles] = useState<Node[]>([]);
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

  // New UI state for tab switching in the code panel
  const [activeTab, setActiveTab] = useState<"code" | "analysis">("code");
  // State for the selected analysis item (function or variable)
  const [selectedAnalysisItem, setSelectedAnalysisItem] = useState<{
    type: "function" | "variable";
    data: FunctionSymbol | VariableSymbol;
  } | null>(null);

  // ------------------------------
  // Helper: Open a File (adds to openedFiles and sets as selected)
  // ------------------------------
  const openFile = (node: Node) => {
    setOpenedFiles((prev) => {
      if (!prev.find((f) => f.id === node.id)) {
        return [...prev, node];
      }
      return prev;
    });
    setSelectedFile(node);
    setActiveTab("code");
  };

  // Open a file reference by file name/path using graphData
  const openFileReference = (file: string) => {
    if (graphData) {
      const found = graphData.nodes.find(
        (n) =>
          n.path === file ||
          n.name === file ||
          (n.path && n.path.includes(file))
      );
      if (found) {
        openFile(found);
      } else {
        alert("File not found in project files.");
      }
    }
  };

  // ------------------------------
  // Fetch Graph Data
  // ------------------------------
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const fullUrl = `${githubUrl}`;
        const response = await fetch(
          "https://23d3-128-185-112-57.ngrok-free.app/receive",
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
        // Assign a random color from a minimal palette for each node
        const colorPalette = [
          "#4a90e2",
          "#50e3c2",
          "#7ed321",
          "#f5a623",
          "#bd10e0",
          "#d0021b",
          "#9b9b9b",
          "#9013fe",
          "#f8e71c",
        ];
        data.nodes = data.nodes.map((node) => ({
          ...node,
          color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
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

  // ------------------------------
  // Fetch Analysis Data (summary)
  // ------------------------------
  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const response = await fetch(
          "https://757c-128-185-112-57.ngrok-free.app/analyze/test2"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch analysis data");
        }
        const data = await response.json();
        setAnalysisData(data);
        setAnalysisLoading(false);
      } catch (err) {
        console.error("Failed to fetch analysis data:", err);
        setAnalysisError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setAnalysisLoading(false);
      }
    };

    fetchAnalysisData();
  }, []);

  // ------------------------------
  // Fetch JS Analysis Report from local data.json
  // ------------------------------
  useEffect(() => {
    const fetchJSAnalysis = async () => {
      try {
        // Call your Next.js API route (e.g., /api/analysis)
        const response = await fetch(
          "https://23d3-128-185-112-57.ngrok-free.app/analysis",
          {
            method: "POST",
            headers: {
              "Content-Type": "text/plain",
              Accept: "application/json",
            },
            body: `repo_name=vitty`,
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch JS analysis report from API");
        }
        const jsonData = await response.json();
        // jsonData is expected to have a top-level "data" property.
        // Transform the keys from snake_case to camelCase.
        const transformed: JSAnalysisReport[] = jsonData.data.map(
          (report: any) => ({
            file: report.file,
            functions: report.functions
              ? report.functions.map((func: any) => ({
                  name: func.name,
                  startLine: func.start_line ?? func.startLine,
                  endLine: func.end_line ?? func.endLine,
                  calls: func.calls || [],
                }))
              : [],
            variables: report.variables
              ? report.variables.map((vari: any) => ({
                  name: vari.name,
                  definedAtLine: vari.defined_at_line ?? vari.definedAtLine,
                  transformations: vari.transformations
                    ? vari.transformations.map((trans: any) => ({
                        file: trans.file,
                        line: trans.line,
                      }))
                    : [],
                  usedInFiles: vari.used_in_files || [],
                }))
              : [],
          })
        );
        setAnalysis(transformed);
      } catch (err) {
        console.error("Failed to fetch JS analysis report:", err);
        // Optionally set an error state here
      }
    };

    fetchJSAnalysis();
  }, []);

  // ------------------------------
  // Filter Functions
  // ------------------------------
  const getFilteredNodes = (): Node[] => {
    if (!graphData || !graphData.nodes) return [];
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

  const getFilteredLinks = (): Link[] => {
    if (!graphData || !graphData.links) return [];
    const filteredNodes = getFilteredNodes();
    const nodeIds = new Set(filteredNodes.map((node) => node.id));
    return graphData.links.filter((link) => {
      if (!link || link.source === undefined || link.target === undefined)
        return false;
      const sourceId = getNodeId(link.source);
      const targetId = getNodeId(link.target);
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
  };

  // ------------------------------
  // Connected Nodes (for selected node)
  // ------------------------------
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

  // ------------------------------
  // D3 Rendering
  // ------------------------------
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
      .style("background", "#222222");

    // Zoom functionality
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

    // Force simulation
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

    // Arrowhead marker for links
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

    // Create curved links with conditional styling for selected node paths
    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll<SVGPathElement, Link>("path")
      .data(filteredLinks)
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .style("opacity", 0.2)
      .attr("marker-end", "url(#arrowhead)");

    // Create nodes with drag and click handlers
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
        // If a node is clicked from the graph, also open it in tabs.
        if (clickedNode) {
          openFile(clickedNode);
        }
      });
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
    // Append circles to nodes
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
      .attr("stroke", (d) => (selectedNode?.id === d.id ? "#fff" : "#222222"))
      .attr("stroke-width", (d) => (selectedNode?.id === d.id ? 2 : 1.5));

    // Append labels to nodes
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
      .style("pointer-events", "none")
      .style("font-family", "sans-serif");

    // Simulation tick: update link and node positions
    simulation.on("tick", () => {
      link
        .attr("d", (d) => {
          const sourceNode = getNodeById(filteredNodes, d.source);
          const targetNode = getNodeById(filteredNodes, d.target);
          const sourceX = sourceNode?.x ?? 0;
          const sourceY = sourceNode?.y ?? 0;
          const targetX = targetNode?.x ?? 0;
          const targetY = targetNode?.y ?? 0;
          // Check for multiple links and compute a curved (quadratic Bézier) path if needed
          const multipleLinks = filteredLinks.filter((l) => {
            const s1 = getNodeId(l.source);
            const t1 = getNodeId(l.target);
            const s2 = getNodeId(d.source);
            const t2 = getNodeId(d.target);
            return (s1 === s2 && t1 === t2) || (s1 === t2 && t1 === s2);
          });
          if (multipleLinks.length > 1) {
            const index = multipleLinks.indexOf(d);
            const offset = (index - (multipleLinks.length - 1) / 2) * 20;
            const mx = (sourceX + targetX) / 2 + offset;
            const my = (sourceY + targetY) / 2 + offset;
            return `M${sourceX},${sourceY} Q${mx},${my} ${targetX},${targetY}`;
          } else {
            return `M${sourceX},${sourceY} L${targetX},${targetY}`;
          }
        })
        // Conditional styling for links (highlight links connected to the selected node)
        .attr("stroke", (l) => {
          if (selectedNode) {
            const sourceId = getNodeId(l.source);
            const targetId = getNodeId(l.target);
            return sourceId === selectedNode.id || targetId === selectedNode.id
              ? "#FFF"
              : "#58A6FF";
          }
          return "#58A6FF";
        })
        .attr("stroke-width", (l) => {
          if (selectedNode) {
            const sourceId = getNodeId(l.source);
            const targetId = getNodeId(l.target);
            return sourceId === selectedNode.id || targetId === selectedNode.id
              ? 2
              : 0.8;
          }
          return 0.8;
        });

      node.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData, selectedNode, connectedNodes, categoryFilters, searchTerm]);

  // ------------------------------
  // Drag Behavior for Nodes
  // ------------------------------
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

  // ------------------------------
  // UI Helper Functions
  // ------------------------------
  const toggleCategoryFilter = (category: string) => {
    setCategoryFilters((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // ------------------------------
  // UI Rendering
  // ------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-300 font-sans">
        Loading graph data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500 font-sans">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#222222] text-gray-300 font-sans">
      {/* Header */}
      <header className="p-4 bg-[#1a1a1a] w-full">
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
                    category,
                    categoryFilters[category]
                  )} transition-colors duration-200`}
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
              className="px-4 py-2 bg-[#2a2a2a] text-gray-300 rounded border border-gray-600 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-200 transition-colors duration-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: File System, Code/Analysis Panel & Graph Panel */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* File System Panel */}
        <div className="md:w-1/4 w-full bg-[#2a2a2a] border-r border-gray-600 overflow-y-auto p-4">
          <h2 className="font-semibold mb-4 text-gray-200">Project Files</h2>
          {selectedNode ? (
            <>
              <div className="mb-4 p-3 bg-[#3a3a3a] rounded">
                <h3 className="font-medium text-gray-100">
                  {selectedNode.name}
                </h3>
                <div className="text-xs text-gray-400 mt-1">
                  {selectedNode.category}
                </div>
              </div>
              <h3 className="font-medium mb-2 text-gray-200">
                Connected Files:
              </h3>
              <div className="space-y-2">
                {connectedNodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={() => openFile(node)}
                    className={`p-2 rounded cursor-pointer hover:bg-[#3a3a3a] transition-colors duration-200 ${
                      selectedFile?.id === node.id ? "bg-[#3a3a3a]" : ""
                    }`}
                  >
                    <div className="font-medium text-gray-100">{node.name}</div>
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

        {/* Code / Analysis Panel */}
        <div className="md:w-1/3 w-full bg-[#2a2a2a] border-r border-gray-600 overflow-y-auto p-4">
          {/* Opened Files Tabs */}
          {openedFiles.length > 0 && (
            <div className="flex space-x-2 mb-2 border-b border-gray-600 pb-2">
              {openedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`px-3 py-1 rounded cursor-pointer transition-colors duration-200 ${
                    selectedFile?.id === file.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300"
                  }`}
                  onClick={() => setSelectedFile(file)}
                >
                  {file.name}
                  <span
                    className="ml-1 text-xs hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenedFiles((prev) =>
                        prev.filter((f) => f.id !== file.id)
                      );
                      if (selectedFile?.id === file.id) setSelectedFile(null);
                    }}
                  >
                    ×
                  </span>
                </div>
              ))}
            </div>
          )}
          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-4 border-b border-gray-600 pb-2">
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "code"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              } transition-colors duration-200`}
              onClick={() => setActiveTab("code")}
            >
              Code
            </button>
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "analysis"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              } transition-colors duration-200`}
              onClick={() => setActiveTab("analysis")}
            >
              Analysis
            </button>
          </div>
          {activeTab === "code" ? (
            // Code View
            selectedFile ? (
              selectedFile.content ? (
                <div className="bg-[#2a2a2a] rounded">
                  <Editor
                    value={selectedFile.content}
                    onValueChange={() => {}}
                    highlight={(code) => (
                      <PrismHighlight
                        code={code}
                        language="typescript"
                        theme={themes.dracula}
                      >
                        {({ tokens, getLineProps, getTokenProps }) => (
                          <div className="p-2">
                            {tokens.map((line, i) => (
                              <div key={i} {...getLineProps({ line, key: i })}>
                                {line.map((token, key) => (
                                  <span
                                    key={key}
                                    {...getTokenProps({ token, key })}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </PrismHighlight>
                    )}
                    padding={16}
                    style={{
                      fontFamily: '"Fira Code", monospace',
                      fontSize: 14,
                      backgroundColor: "#2a2a2a",
                      color: "#E0E0E0",
                    }}
                    readOnly
                  />
                </div>
              ) : (
                <div className="text-gray-400 italic">
                  Select a file to view its content
                </div>
              )
            ) : (
              <div className="text-gray-400 italic">
                Select a file to view its content
              </div>
            )
          ) : (
            // Analysis View
            <div className="space-y-4">
              {selectedFile && analysis ? (
                (() => {
                  // Find the analysis report corresponding to the selected file.
                  const fileAnalysis = analysis.find(
                    (report) =>
                      selectedFile.path === report.file ||
                      selectedFile.name === report.file
                  );
                  if (!fileAnalysis) {
                    return (
                      <p className="text-gray-500">
                        No analysis available for the selected file.
                      </p>
                    );
                  }
                  return (
                    <>
                      <h2 className="text-lg font-bold">
                        Analysis for {selectedFile.name}
                      </h2>
                      <div>
                        <h3 className="font-semibold mb-1">Functions</h3>
                        {fileAnalysis.functions &&
                        fileAnalysis.functions.length > 0 ? (
                          <ul className="space-y-1">
                            {fileAnalysis.functions.map((func, idx) => (
                              <li
                                key={idx}
                                className="cursor-pointer hover:underline text-blue-400"
                                onClick={() =>
                                  setSelectedAnalysisItem({
                                    type: "function",
                                    data: func,
                                  })
                                }
                              >
                                {func.name} (Lines: {func.startLine}-
                                {func.endLine})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No functions found.</p>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Variables</h3>
                        {fileAnalysis.variables &&
                        fileAnalysis.variables.length > 0 ? (
                          <ul className="space-y-1">
                            {fileAnalysis.variables.map((vari, idx) => (
                              <li
                                key={idx}
                                className="cursor-pointer hover:underline text-blue-400"
                                onClick={() =>
                                  setSelectedAnalysisItem({
                                    type: "variable",
                                    data: vari,
                                  })
                                }
                              >
                                {vari.name} (Defined at line{" "}
                                {vari.definedAtLine})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No variables found.</p>
                        )}
                      </div>
                      {selectedAnalysisItem && (
                        <div className="mt-4 p-3 bg-gray-800 rounded">
                          <h4 className="font-bold mb-2">
                            {selectedAnalysisItem.type === "function"
                              ? "Function Details"
                              : "Variable Details"}
                          </h4>
                          {selectedAnalysisItem.type === "function"
                            ? (() => {
                                const func =
                                  selectedAnalysisItem.data as FunctionSymbol;
                                return (
                                  <div>
                                    <p>
                                      <span className="font-semibold">
                                        Name:
                                      </span>{" "}
                                      {func.name}
                                    </p>
                                    <p>
                                      <span className="font-semibold">
                                        Lines:
                                      </span>{" "}
                                      {func.startLine} - {func.endLine}
                                    </p>
                                    {func.calls && func.calls.length > 0 ? (
                                      <div className="mt-2">
                                        <p className="font-semibold">Calls:</p>
                                        <ul className="list-disc ml-4">
                                          {func.calls.map((call, i) => (
                                            <li
                                              key={i}
                                              className="cursor-pointer hover:underline text-blue-400"
                                              onClick={() =>
                                                openFileReference(
                                                  fileAnalysis.file
                                                )
                                              }
                                            >
                                              {call.name} at line {call.line}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ) : (
                                      <p>No calls found.</p>
                                    )}
                                  </div>
                                );
                              })()
                            : (() => {
                                const vari =
                                  selectedAnalysisItem.data as VariableSymbol;
                                return (
                                  <div>
                                    <p>
                                      <span className="font-semibold">
                                        Name:
                                      </span>{" "}
                                      {vari.name}
                                    </p>
                                    <p>
                                      <span className="font-semibold">
                                        Defined At:
                                      </span>{" "}
                                      {vari.definedAtLine}
                                    </p>
                                    {vari.transformations &&
                                      vari.transformations.length > 0 && (
                                        <div className="mt-2">
                                          <p className="font-semibold">
                                            Transformations:
                                          </p>
                                          <ul className="list-disc ml-4">
                                            {vari.transformations.map(
                                              (trans, i) => (
                                                <li
                                                  key={i}
                                                  className="cursor-pointer hover:underline text-blue-400"
                                                  onClick={() =>
                                                    openFileReference(
                                                      trans.file
                                                    )
                                                  }
                                                >
                                                  {trans.file} at line{" "}
                                                  {trans.line}
                                                </li>
                                              )
                                            )}
                                          </ul>
                                        </div>
                                      )}
                                    {vari.usedInFiles &&
                                      vari.usedInFiles.length > 0 && (
                                        <div className="mt-2">
                                          <p className="font-semibold">
                                            Used In:
                                          </p>
                                          <ul className="list-disc ml-4">
                                            {vari.usedInFiles.map((file, i) => (
                                              <li
                                                key={i}
                                                className="cursor-pointer hover:underline text-blue-400"
                                                onClick={() =>
                                                  openFileReference(file)
                                                }
                                              >
                                                {file}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                  </div>
                                );
                              })()}
                        </div>
                      )}
                    </>
                  );
                })()
              ) : (
                <p className="text-gray-500">
                  No analysis available for the selected file.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Graph Visualization Panel */}
        <div className="flex-1 bg-[#222222] overflow-hidden h-[300px] md:h-auto">
          <svg ref={svgRef} className="w-full h-full"></svg>
        </div>
      </div>

      {/* Analysis Summary Panel (bottom) */}
    </div>
  );
};

export default ObsidianGraph;
