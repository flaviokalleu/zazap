import React, { useState, useEffect, useContext, useCallback } from "react";
import { Rocket, Book, Rss, Divide, Clock, CheckCircle, MessageSquare, Bot, HelpCircle, MessageCircle, Image as LucideImage, MicOff, Video } from "lucide-react";
import typebotIcon from "../../assets/typebot-ico.png";
import { toast } from "react-toastify";
import { useHistory, useParams } from "react-router-dom";
import api from "../../services/api";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import "reactflow/dist/style.css";
import ReactFlow, { MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge } from "react-flow-renderer";
import FlowBuilderAddTextModal from "../../components/FlowBuilderAddTextModal";
import FlowBuilderIntervalModal from "../../components/FlowBuilderIntervalModal";
import FlowBuilderConditionModal from "../../components/FlowBuilderConditionModal";
import FlowBuilderMenuModal from "../../components/FlowBuilderMenuModal";
import RemoveEdge from "./nodes/removeEdge";
import FlowBuilderAddImgModal from "../../components/FlowBuilderAddImgModal";
import FlowBuilderTicketModal from "../../components/FlowBuilderAddTicketModal";
import FlowBuilderAddAudioModal from "../../components/FlowBuilderAddAudioModal";
import { useNodeStorage } from "../../stores/useNodeStorage";
import FlowBuilderRandomizerModal from "../../components/FlowBuilderRandomizerModal";
import FlowBuilderAddVideoModal from "../../components/FlowBuilderAddVideoModal";
import FlowBuilderSingleBlockModal from "../../components/FlowBuilderSingleBlockModal";
import FlowBuilderTypebotModal from "../../components/FlowBuilderAddTypebotModal";
import FlowBuilderOpenAIModal from "../../components/FlowBuilderAddOpenAIModal";
import FlowBuilderAddQuestionModal from "../../components/FlowBuilderAddQuestionModal";
import audioNode from "./nodes/audioNode";
import typebotNode from "./nodes/typebotNode";
import openaiNode from "./nodes/openaiNode";
import messageNode from "./nodes/messageNode";
import startNode from "./nodes/startNode";
import menuNode from "./nodes/menuNode";
import intervalNode from "./nodes/intervalNode";
import imgNode from "./nodes/imgNode";
import randomizerNode from "./nodes/randomizerNode";
import videoNode from "./nodes/videoNode";
import questionNode from "./nodes/questionNode";
import singleBlockNode from "./nodes/singleBlockNode";
import ticketNode from "./nodes/ticketNode";

function geraStringAleatoria(tamanho) {
  var stringAleatoria = "";
  var caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < tamanho; i++) {
    stringAleatoria += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return stringAleatoria;
}

const nodeTypes = {
  message: messageNode,
  start: startNode,
  menu: menuNode,
  interval: intervalNode,
  img: imgNode,
  audio: audioNode,
  randomizer: randomizerNode,
  video: videoNode,
  singleBlock: singleBlockNode,
  ticket: ticketNode,
  typebot: typebotNode,
  openai: openaiNode,
  question: questionNode,
};

const edgeTypes = {
  buttonedge: RemoveEdge,
};

const initialNodes = [
  {
    id: "1",
    position: { x: 250, y: 100 },
    data: { label: "Inicio do fluxo" },
    type: "start",
    style: {
      backgroundColor: "#fff",
      borderRadius: "12px",
      boxShadow: "0 0 5px #ccc",
      padding: "10px",
    },
  },
];

const initialEdges = [];

export const FlowBuilderConfig = () => {
  const history = useHistory();
  const { id } = useParams();
  const storageItems = useNodeStorage();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [dataNode, setDataNode] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [modalAddText, setModalAddText] = useState(null);
  const [modalAddInterval, setModalAddInterval] = useState(false);
  const [modalAddMenu, setModalAddMenu] = useState(null);
  const [modalAddImg, setModalAddImg] = useState(null);
  const [modalAddAudio, setModalAddAudio] = useState(null);
  const [modalAddRandomizer, setModalAddRandomizer] = useState(null);
  const [modalAddVideo, setModalAddVideo] = useState(null);
  const [modalAddSingleBlock, setModalAddSingleBlock] = useState(null);
  const [modalAddTicket, setModalAddTicket] = useState(null);
  const [modalAddTypebot, setModalAddTypebot] = useState(null);
  const [modalAddOpenAI, setModalAddOpenAI] = useState(null);
  const [modalAddQuestion, setModalAddQuestion] = useState(null);

  // Estilo da linha de conexão como cabo de eletricidade
  const connectionLineStyle = {
    stroke: "url(#electric-gradient)", // Usando gradiente SVG
    strokeWidth: "4px",
    strokeDasharray: "10, 5", // Efeito de traços para parecer um cabo
    animation: "electricFlow 1.5s infinite linear",
  };

  const addNode = (type, data) => {
    const posY = nodes[nodes.length - 1].position.y;
    const posX = nodes[nodes.length - 1].position.x + nodes[nodes.length - 1].width + 40;
    const nodeStyle = {
      backgroundColor: "#fff",
      borderRadius: "12px",
      boxShadow: "0 0 5px #ccc",
      padding: "10px",
    };

    if (type === "start") {
      return setNodes((old) => [
        {
          id: "1",
          position: { x: posX, y: posY },
          data: { label: "Inicio do fluxo" },
          type: "start",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "text") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { label: data.text },
          type: "message",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "interval") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { label: `Intervalo ${data.sec} seg.`, sec: data.sec },
          type: "interval",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "condition") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { key: data.key, condition: data.condition, value: data.value },
          type: "condition",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "menu") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { message: data.message, arrayOption: data.arrayOption },
          type: "menu",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "img") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { url: data.url },
          type: "img",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "audio") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { url: data.url, record: data.record },
          type: "audio",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "randomizer") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { percent: data.percent },
          type: "randomizer",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "video") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { url: data.url },
          type: "video",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "singleBlock") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { ...data },
          type: "singleBlock",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "ticket") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { ...data },
          type: "ticket",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "typebot") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { ...data },
          type: "typebot",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "openai") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { ...data },
          type: "openai",
          style: nodeStyle,
        },
      ]);
    }
    if (type === "question") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: { ...data },
          type: "question",
          style: nodeStyle,
        },
      ]);
    }
  };

  const textAdd = (data) => addNode("text", data);
  const intervalAdd = (data) => addNode("interval", data);
  const conditionAdd = (data) => addNode("condition", data);
  const menuAdd = (data) => addNode("menu", data);
  const imgAdd = (data) => addNode("img", data);
  const audioAdd = (data) => addNode("audio", data);
  const randomizerAdd = (data) => addNode("randomizer", data);
  const videoAdd = (data) => addNode("video", data);
  const singleBlockAdd = (data) => addNode("singleBlock", data);
  const ticketAdd = (data) => addNode("ticket", data);
  const typebotAdd = (data) => addNode("typebot", data);
  const openaiAdd = (data) => addNode("openai", data);
  const questionAdd = (data) => addNode("question", data);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get(`/flowbuilder/flow/${id}`);
          if (data.flow.flow !== null) {
            const flowNodes = data.flow.flow.nodes;
            setNodes(flowNodes);
            setEdges(data.flow.flow.connections);
            const filterVariables = flowNodes.filter((nd) => nd.type === "question");
            const variables = filterVariables.map((variable) => variable.data.typebotIntegration.answerKey);
            localStorage.setItem("variables", JSON.stringify(variables));
          }
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [id]);

  useEffect(() => {
    if (storageItems.action === "delete") {
      setNodes((old) => old.filter((item) => item.id !== storageItems.node));
      setEdges((old) => {
        const newData = old.filter((item) => item.source !== storageItems.node);
        const newClearTarget = newData.filter((item) => item.target !== storageItems.node);
        return newClearTarget;
      });
      storageItems.setNodesStorage("");
      storageItems.setAct("idle");
    }
    if (storageItems.action === "duplicate") {
      const nodeDuplicate = nodes.filter((item) => item.id === storageItems.node)[0];
      const maioresX = nodes.map((node) => node.position.x);
      const maiorX = Math.max(...maioresX);
      const finalY = nodes[nodes.length - 1].position.y;
      const nodeNew = {
        ...nodeDuplicate,
        id: geraStringAleatoria(30),
        position: { x: maiorX + 240, y: finalY },
        selected: false,
        style: {
          backgroundColor: "#fff",
          padding: "10px",
          borderRadius: "12px",
          boxShadow: "0 0 5px #ccc",
        },
      };
      setNodes((old) => [...old, nodeNew]);
      storageItems.setNodesStorage("");
      storageItems.setAct("idle");
    }
  }, [storageItems.action]);

  const loadMore = () => setPageNumber((prevState) => prevState + 1);

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge({ ...params, type: "buttonedge", style: connectionLineStyle }, eds)
      ),
    [setEdges]
  );

  const saveFlow = async () => {
    await api
      .post("/flowbuilder/flow", {
        idFlow: id,
        nodes: nodes,
        connections: edges,
      })
      .then((res) => {
        toast.success("Fluxo salvo com sucesso");
      });
  };

  const doubleClick = (event, node) => {
    setDataNode(node);
    if (node.type === "message") setModalAddText("edit");
    if (node.type === "interval") setModalAddInterval("edit");
    if (node.type === "menu") setModalAddMenu("edit");
    if (node.type === "img") setModalAddImg("edit");
    if (node.type === "audio") setModalAddAudio("edit");
    if (node.type === "randomizer") setModalAddRandomizer("edit");
    if (node.type === "singleBlock") setModalAddSingleBlock("edit");
    if (node.type === "ticket") setModalAddTicket("edit");
    if (node.type === "typebot") setModalAddTypebot("edit");
    if (node.type === "openai") setModalAddOpenAI("edit");
    if (node.type === "question") setModalAddQuestion("edit");
  };

  const clickNode = (event, node) => {
    setNodes((old) =>
      old.map((item) => {
        if (item.id === node.id) {
          return {
            ...item,
            style: {
              backgroundColor: "#e6f0ff",
              padding: "10px",
              borderRadius: "12px",
              boxShadow: "0 0 10px #007bff",
            },
          };
        }
        return {
          ...item,
          style: {
            backgroundColor: "#fff",
            padding: "10px",
            borderRadius: "12px",
            boxShadow: "0 0 5px #ccc",
          },
        };
      })
    );
  };

  const clickEdge = (event, node) => {
    setNodes((old) =>
      old.map((item) => ({
        ...item,
        style: {
          backgroundColor: "#fff",
          padding: "10px",
          borderRadius: "12px",
          boxShadow: "0 0 5px #ccc",
        },
      }))
    );
  };

  const updateNode = (dataAlter) => {
    setNodes((old) =>
      old.map((itemNode) => (itemNode.id === dataAlter.id ? dataAlter : itemNode))
    );
    setModalAddText(null);
    setModalAddInterval(null);
    setModalAddMenu(null);
    setModalAddOpenAI(null);
    setModalAddTypebot(null);
  };

  const actions = [
    { icon: <Rocket size={24} color="#3ABA38" />, name: "Inicio", type: "start" },
    { icon: <Book size={24} color="#EC5858" />, name: "Conteúdo", type: "content" },
    { icon: <Rss size={24} color="#683AC8" />, name: "Menu", type: "menu" },
    { icon: <Divide size={24} color="#1FBADC" />, name: "Randomizador", type: "random" },
    { icon: <Clock size={24} color="#F7953B" />, name: "Intervalo", type: "interval" },
    { icon: <CheckCircle size={24} color="#F7953B" />, name: "Ticket", type: "ticket" },
    {
      icon: <img src={typebotIcon} alt="TypeBot" className="w-6 h-6" />,
      name: "TypeBot",
      type: "typebot",
    },
    { icon: <Bot size={24} color="#F7953B" />, name: "OpenAI", type: "openai" },
    { icon: <HelpCircle size={24} color="#F7953B" />, name: "Pergunta", type: "question" },
  ];

  const clickActions = (type) => {
    switch (type) {
      case "start":
        addNode("start");
        break;
      case "menu":
        setModalAddMenu("create");
        break;
      case "content":
        setModalAddSingleBlock("create");
        break;
      case "random":
        setModalAddRandomizer("create");
        break;
      case "interval":
        setModalAddInterval("create");
        break;
      case "ticket":
        setModalAddTicket("create");
        break;
      case "typebot":
        setModalAddTypebot("create");
        break;
      case "openai":
        setModalAddOpenAI("create");
        break;
      case "question":
        setModalAddQuestion("create");
        break;
      default:
        break;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <FlowBuilderAddTextModal
        open={modalAddText}
        onSave={textAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddText}
      />
      <FlowBuilderIntervalModal
        open={modalAddInterval}
        onSave={intervalAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddInterval}
      />
      <FlowBuilderMenuModal
        open={modalAddMenu}
        onSave={menuAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddMenu}
      />
      <FlowBuilderAddImgModal
        open={modalAddImg}
        onSave={imgAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddImg}
      />
      <FlowBuilderAddAudioModal
        open={modalAddAudio}
        onSave={audioAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddAudio}
      />
      <FlowBuilderRandomizerModal
        open={modalAddRandomizer}
        onSave={randomizerAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddRandomizer}
      />
      <FlowBuilderAddVideoModal
        open={modalAddVideo}
        onSave={videoAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddVideo}
      />
      <FlowBuilderSingleBlockModal
        open={modalAddSingleBlock}
        onSave={singleBlockAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddSingleBlock}
      />
      <FlowBuilderTicketModal
        open={modalAddTicket}
        onSave={ticketAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddTicket}
      />
      <FlowBuilderOpenAIModal
        open={modalAddOpenAI}
        onSave={openaiAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddOpenAI}
      />
      <FlowBuilderTypebotModal
        open={modalAddTypebot}
        onSave={typebotAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddTypebot}
      />
      <FlowBuilderAddQuestionModal
        open={modalAddQuestion}
        onSave={questionAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddQuestion}
      />

      <MainHeader>
        <Title className="text-blue-500 text-lg font-semibold">Desenhe seu fluxo</Title>
      </MainHeader>

      {!loading ? (
        <div
          className="flex-1 bg-gray-100 p-4 rounded-xl shadow-md overflow-y-auto"
          onScroll={handleScroll}
        >
          {/* SVG para o gradiente elétrico */}
          <svg style={{ position: "absolute", width: 0, height: 0 }}>
            <defs>
              <linearGradient id="electric-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: "#00d4ff", stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: "#00ffcc", stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: "#00d4ff", stopOpacity: 1 }} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          <div className="relative">
            {/* Menu Lateral de Ações */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-lg z-10">
              {actions.map((action) => (
                <button
                  key={action.name}
                  onClick={() => clickActions(action.type)}
                  className="flex items-center gap-2 p-2 text-gray-700 hover:bg-blue-100 rounded-md transition-colors duration-200"
                  title={action.name}
                >
                  {action.icon}
                  <span className="text-sm">{action.name}</span>
                </button>
              ))}
            </div>

            {/* Mensagem de Aviso */}
            <div className="flex justify-center mb-4">
              <p className="text-gray-600 text-sm">Não se esqueça de salvar seu fluxo!</p>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end mb-4">
              <button
                onClick={saveFlow}
                className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-md hover:bg-blue-600 transition-colors duration-200"
              >
                Salvar
              </button>
            </div>

            {/* ReactFlow */}
            <div className="w-full h-[80vh] bg-black rounded-lg shadow-md">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                deleteKeyCode={["Backspace", "Delete"]}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDoubleClick={doubleClick}
                onNodeClick={clickNode}
                onEdgeClick={clickEdge}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                connectionLineStyle={connectionLineStyle}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={{
                  style: {
                    ...connectionLineStyle,
                    filter: "url(#glow)", // Adiciona brilho ao cabo
                  },
                  animated: true,
                }}
              >
                <Controls />
                <MiniMap />
                <Background variant="dots" gap={12} size={1} color="#007bff" />
              </ReactFlow>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Estilos para o efeito de eletricidade */}
      <style jsx>{`
        @keyframes electricFlow {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -30;
          }
        }
      `}</style>
    </div>
  );
};