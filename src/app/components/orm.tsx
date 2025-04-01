"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  Edge,
  Connection,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";

type PrismaFieldType =
  | "Int"
  | "String"
  | "Boolean"
  | "DateTime"
  | "Float"
  | "Json"
  | "BigInt"
  | "Decimal"
  | string;

interface PrismaField {
  name: string;
  type: PrismaFieldType;
  isId?: boolean;
  isUnique?: boolean;
  isOptional?: boolean;
  relation?: {
    name?: string;
    fields?: string[];
    references?: string[];
  };
  default?: string;
  isList?: boolean;
  isForeignKey?: boolean;
  referencedModel?: string;
}

interface PrismaModel {
  name: string;
  fields: PrismaField[];
}

interface PrismaSchema {
  models: PrismaModel[];
}

interface NodeData {
  label: string;
  fields: PrismaField[];
}

const ModelNode = ({ data }: { data: NodeData }) => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden min-w-[220px]">
      <div className="bg-blue-600 text-white px-3 py-2 font-semibold">
        {data.label}
      </div>
      <div className="p-2">
        <ul className="space-y-1">
          {data.fields.map((field) => (
            <li
              key={field.name}
              className={`flex justify-between items-center text-sm ${
                field.isForeignKey ? "bg-blue-50" : ""
              }`}
            >
              <span
                className={`font-mono ${
                  field.isId
                    ? "text-purple-600"
                    : field.isUnique
                    ? "text-green-600"
                    : field.relation
                    ? "text-orange-600"
                    : "text-gray-700"
                }`}
                data-field-type={
                  field.isId
                    ? "id"
                    : field.isUnique
                    ? "unique"
                    : field.relation
                    ? "relation"
                    : "regular"
                }
                id={`${data.label}-${field.name}`} // Added proper ID for connection anchors
              >
                {field.name}
                {field.isList ? "[]" : ""}
                {field.isForeignKey && (
                  <span className="ml-1 text-xs text-blue-500">FK</span>
                )}
              </span>
              <span className="text-gray-500 font-mono text-xs">
                {field.type.replace("?", "")}
                {field.isOptional ? "?" : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Custom edge component for better relationship visualization
const RelationshipEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  markerStart,
  label,
}: any) => {
  const [edgePath, setEdgePath] = useState("");
  const [labelX, setLabelX] = useState(0);
  const [labelY, setLabelY] = useState(0);

  useEffect(() => {
    // Calculate curved path for edge
    const centerX = (sourceX + targetX) / 2;
    const centerY = (sourceY + targetY) / 2;

    // Add curvature to the path
    const controlPointX1 = sourceX + (centerX - sourceX) * 0.5;
    const controlPointY1 = sourceY;
    const controlPointX2 = targetX - (targetX - centerX) * 0.5;
    const controlPointY2 = targetY;

    const path = `M ${sourceX},${sourceY} C ${controlPointX1},${controlPointY1} ${controlPointX2},${controlPointY2} ${targetX},${targetY}`;

    setEdgePath(path);
    setLabelX(centerX);
    setLabelY(centerY - 10);
  }, [sourceX, sourceY, targetX, targetY]);

  const getStrokeStyle = () => {
    if (
      data?.relationType === "oneToMany" ||
      data?.relationType === "manyToOne"
    ) {
      return "5 5";
    }

    if (data?.isOptional) {
      return "5 5";
    }

    return "none";
  };

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke="#888"
        strokeWidth={2}
        strokeDasharray={getStrokeStyle()}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs font-bold"
          style={{ fill: "#666", pointerEvents: "none" }}
        >
          {label}
          {data?.relationType && ` (${data.relationType})`}
          {data?.fieldsRef && ` [${data.fieldsRef}→${data.referencesRef}]`}
        </text>
      )}
    </>
  );
};

const nodeTypes: NodeTypes = {
  model: ModelNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

const parsePrismaSchema = (schema: string): PrismaSchema => {
  const models: PrismaModel[] = [];
  const modelRegex = /model\s+(\w+)\s*{([^}]*)}/g;
  let modelMatch;

  while ((modelMatch = modelRegex.exec(schema)) !== null) {
    const modelName = modelMatch[1];
    const modelContent = modelMatch[2];
    const fields: PrismaField[] = [];

    const fieldRegex = /(\w+)\s+([^\s]+)([^@\n]*)(@[^\n]*)?/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(modelContent)) !== null) {
      const fieldName = fieldMatch[1];
      let fieldType = fieldMatch[2].trim();
      const isList = fieldType.endsWith("[]");
      if (isList) fieldType = fieldType.replace("[]", "");
      const isOptional = fieldType.endsWith("?");
      if (isOptional) fieldType = fieldType.replace("?", "");
      const attributes = fieldMatch[4] || "";

      // Improved regex for relation parsing
      const relationMatch = attributes.match(/@relation\(([^)]*)\)/);
      let relation;
      if (relationMatch) {
        const relationParams = relationMatch[1];
        const nameMatch = relationParams.match(/name:\s*"([^"]*)"/);
        const fieldsMatch = relationParams.match(/fields:\s*\[([^\]]+)\]/);
        const referencesMatch = relationParams.match(
          /references:\s*\[([^\]]+)\]/
        );

        relation = {
          name: nameMatch ? nameMatch[1] : undefined,
          fields: fieldsMatch
            ? fieldsMatch[1].split(",").map((s) => s.trim().replace(/"/g, ""))
            : undefined,
          references: referencesMatch
            ? referencesMatch[1]
                .split(",")
                .map((s) => s.trim().replace(/"/g, ""))
            : undefined,
        };
      }

      // Determine if field is a foreign key
      const isForeignKey = relation?.fields?.includes(fieldName) || false;

      // Extract referenced model for foreign keys
      const referencedModel = fieldType;

      const field: PrismaField = {
        name: fieldName,
        type: fieldType,
        isId: attributes.includes("@id"),
        isUnique: attributes.includes("@unique"),
        isOptional,
        relation,
        isList,
        isForeignKey,
        referencedModel: isForeignKey ? referencedModel : undefined,
      };

      fields.push(field);
    }

    models.push({
      name: modelName,
      fields,
    });
  }

  return { models };
};

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 240;
const nodeHeight = 200;

const getLayoutedElements = (nodes: any[], edges: Edge[]) => {
  dagreGraph.setGraph({ rankdir: "TB", ranksep: 150, nodesep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes, edges };
};

// Determine relationship type between models
const determineRelationshipType = (
  sourceModel: PrismaModel,
  targetModel: PrismaModel,
  field: PrismaField
) => {
  // Check for one-to-many relationship
  if (field.isList) {
    return "oneToMany";
  }

  // Check for many-to-one relationship
  const reverseRelation = targetModel.fields.find(
    (f) =>
      f.relation?.name === field.relation?.name && f.type === sourceModel.name
  );

  if (reverseRelation && reverseRelation.isList) {
    return "manyToOne";
  }

  // Check for many-to-many relationship
  if (reverseRelation && !reverseRelation.isList && field.relation?.name) {
    const otherModelsWithSameRelation = sourceModel.fields.filter(
      (f) => f.relation?.name === field.relation?.name && f.name !== field.name
    );

    if (otherModelsWithSameRelation.length > 0) {
      return "manyToMany";
    }

    return "oneToOne";
  }

  return field.isOptional ? "optionalOneToOne" : "oneToOne";
};

// Flow component that uses the hooks
const FlowComponent = ({ schema }: { schema: string }) => {
  const { models } = useMemo(() => parsePrismaSchema(schema), [schema]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        const flowWrapper = document.querySelector(".react-flow");
        if (flowWrapper) {
          const { width, height } = flowWrapper.getBoundingClientRect();
          if (width > 0 && height > 0) {
            // Re-calculate layout if needed
            const { nodes: layoutedNodes } = getLayoutedElements(
              [...nodes],
              [...edges]
            );
            setNodes(layoutedNodes);
          }
        }
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [nodes, edges, setNodes]);

  useEffect(() => {
    const initialNodes = models.map((model) => ({
      id: model.name,
      type: "model" as const,
      data: {
        label: model.name,
        fields: model.fields,
      },
      position: { x: 0, y: 0 }, // Initial position will be set by dagre
    }));

    const initialEdges: Edge[] = models.flatMap((sourceModel) => {
      return sourceModel.fields
        .filter((field) => field.relation)
        .map((field) => {
          const targetModel = models.find((m) => m.name === field.type);
          if (!targetModel) return null;

          const relationType = determineRelationshipType(
            sourceModel,
            targetModel,
            field
          );

          // Find the foreign key fields
          const fkFields = field.relation?.fields || [];
          const refFields = field.relation?.references || [];

          let markerEnd = {
            type: MarkerType.Arrow,
            color: "#888",
            width: 15,
            height: 15,
          };
          let markerStart = undefined;

          // Set markers based on relationship type
          if (relationType === "manyToMany") {
            markerStart = {
              type: MarkerType.Arrow,
              color: "#888",
              width: 15,
              height: 15,
            };
          } else if (relationType === "oneToMany") {
            markerEnd = {
              type: MarkerType.ArrowClosed,
              color: "#888",
              width: 15,
              height: 15,
            };
          } else if (relationType === "manyToOne") {
            markerStart = {
              type: MarkerType.ArrowClosed,
              color: "#888",
              width: 15,
              height: 15,
            };
          }

          return {
            id: `${sourceModel.name}-${field.name}-${targetModel.name}`,
            source: sourceModel.name,
            target: targetModel.name,
            sourceHandle:
              fkFields.length > 0
                ? `${sourceModel.name}-${fkFields[0]}`
                : undefined,
            targetHandle:
              refFields.length > 0
                ? `${targetModel.name}-${refFields[0]}`
                : undefined,
            type: "relationship",
            label: field.relation?.name || "",
            animated: relationType === "manyToMany",
            style: {
              stroke: "#888",
              strokeWidth: 2,
              strokeDasharray: field.isOptional ? "5 5" : "none",
            },
            data: {
              relationType,
              fieldsRef: fkFields.join(", "),
              referencesRef: refFields.join(", "),
              isOptional: field.isOptional,
            },
            markerEnd,
            ...(markerStart && { markerStart }),
          };
        })
        .filter(Boolean) as Edge[];
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes,
      initialEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [models, setNodes, setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      snapToGrid={true}
      snapGrid={[15, 15]}
      defaultEdgeOptions={{
        type: "relationship",
        markerEnd: {
          type: MarkerType.Arrow,
          color: "#888",
        },
      }}
    >
      <Controls />
      <MiniMap />
      <Background color="#ffffff" gap={16} />
      <Panel position="top-right">
        <div className="bg-white p-3 rounded shadow text-xs space-y-2 border border-gray-200">
          <div className="font-bold mb-1">Field Types</div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-600 mr-2 rounded-full"></div>
            <span>ID Field</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-600 mr-2 rounded-full"></div>
            <span>Unique Field</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-600 mr-2 rounded-full"></div>
            <span>Relation Field</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 mr-2 rounded-full"></div>
            <span>Regular Field</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-50 mr-2 border border-blue-200 rounded"></div>
            <span className="text-blue-600">Foreign Key</span>
          </div>

          <div className="font-bold mt-3 mb-1">Relationships</div>
          <div className="flex items-center">
            <svg width="80" height="24" className="mr-2">
              <path
                d="M10,12 L70,12"
                stroke="#888"
                strokeWidth="2"
                markerEnd="url(#react-flow__arrowclosed)"
              />
            </svg>
            <span>One-to-One (1:1)</span>
          </div>
          <div className="flex items-center">
            <svg width="80" height="24" className="mr-2">
              <path
                d="M10,12 L70,12"
                stroke="#888"
                strokeWidth="2"
                markerEnd="url(#react-flow__arrowclosed)"
              />
            </svg>
            <span>One-to-Many (1:n)</span>
          </div>
          <div className="flex items-center">
            <svg width="80" height="24" className="mr-2">
              <path
                d="M10,12 L70,12"
                stroke="#888"
                strokeWidth="2"
                markerStart="url(#react-flow__arrowclosed)"
                markerEnd="url(#react-flow__arrowclosed)"
              />
            </svg>
            <span>Many-to-Many (m:n)</span>
          </div>
          <div className="flex items-center">
            <svg width="80" height="24" className="mr-2">
              <path
                d="M10,12 L70,12"
                stroke="#888"
                strokeWidth="2"
                strokeDasharray="5,5"
                markerEnd="url(#react-flow__arrowclosed)"
              />
            </svg>
            <span>Optional Relation</span>
          </div>
          <div className="flex items-center">
            <svg width="80" height="24" className="mr-2">
              <path
                d="M10,12 L70,12"
                stroke="#888"
                strokeWidth="2"
                strokeDasharray="none"
                className="animate-dash"
                markerEnd="url(#react-flow__arrowclosed)"
              />
            </svg>
            <span>Animated Relation</span>
          </div>
        </div>
      </Panel>
    </ReactFlow>
  );
};

const ORMVisualizer: React.FC<{ schema: string }> = ({ schema }) => {
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <ReactFlowProvider>
        <FlowComponent schema={schema} />
      </ReactFlowProvider>
    </div>
  );
};

export default ORMVisualizer;
