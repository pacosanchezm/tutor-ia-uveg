"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import Image from "next/image";

// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import Board from "./components/Board";
import BottomToolbar from "./components/BottomToolbar";

// Types
import { SessionStatus, BoardContentAction } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { customerServiceRetailScenario } from "@/app/agentConfigs/customerServiceRetail";
import { chatSupervisorScenario } from "@/app/agentConfigs/chatSupervisor";
import { customerServiceRetailCompanyName } from "@/app/agentConfigs/customerServiceRetail";
import { chatSupervisorCompanyName } from "@/app/agentConfigs/chatSupervisor";
import { simpleHandoffScenario } from "@/app/agentConfigs/simpleHandoff";
import { universityTutorScenario, universityTutorInstitutionName } from "@/app/agentConfigs/universityTutor";

// Map used by connect logic for scenarios defined via the SDK.
const sdkScenarioMap: Record<string, RealtimeAgent[]> = {
  simpleHandoff: simpleHandoffScenario,
  customerServiceRetail: customerServiceRetailScenario,
  chatSupervisor: chatSupervisorScenario,
  universityTutor: universityTutorScenario,
};

import useAudioDownload from "./hooks/useAudioDownload";
import { useHandleSessionHistory } from "./hooks/useHandleSessionHistory";

function App() {
  const searchParams = useSearchParams()!;

  // ---------------------------------------------------------------------
  // Codec selector – lets you toggle between wide-band Opus (48 kHz)
  // and narrow-band PCMU/PCMA (8 kHz) to hear what the agent sounds like on
  // a traditional phone line and to validate ASR / VAD behaviour under that
  // constraint.
  //
  // We read the `?codec=` query-param and rely on the `changePeerConnection`
  // hook (configured in `useRealtimeSession`) to set the preferred codec
  // before the offer/answer negotiation.
  // ---------------------------------------------------------------------
  const urlCodec = searchParams.get("codec") || "opus";

  // Agents SDK doesn't currently support codec selection so it is now forced 
  // via global codecPatch at module load 

  const {
    addTranscriptMessage,
    addTranscriptBreadcrumb,
  } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<
    RealtimeAgent[] | null
  >(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Ref to identify whether the latest agent switch came from an automatic handoff
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setSelectedAgentName(agentName);
    },
  });

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [rightPaneView, setRightPaneView] =
    useState<"logs" | "board">(() => {
      if (typeof window === "undefined") return "board";
      const stored = localStorage.getItem("rightPaneView");
      return stored === "logs" || stored === "board" ? (stored as "logs" | "board") : "board";
    });
  const [isTranscriptVisible, setIsTranscriptVisible] =
    useState<boolean>(() => {
      if (typeof window === "undefined") return false;
      const stored = localStorage.getItem("transcriptVisible");
      return stored ? stored === "true" : false;
    });
  const [autoConnectEnabled, setAutoConnectEnabled] = useState<boolean>(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const [boardContentKey, setBoardContentKey] =
    useState<BoardContentAction>("CLEAN");
  const [selectedRealtimeModel, setSelectedRealtimeModel] = useState<string>(
    () => {
      if (typeof window === "undefined") return "gpt-realtime-mini";
      return localStorage.getItem("realtimeModel") ?? "gpt-realtime-mini";
    },
  );
  const prevAgentNameRef = useRef<string | null>(null);
  const handleBoardContentAction = useCallback(
    (action: BoardContentAction) => {
      setBoardContentKey(action);
      addTranscriptBreadcrumb("Board", { action });
    },
    [addTranscriptBreadcrumb],
  );
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    if (
      autoConnectEnabled &&
      selectedAgentName &&
      sessionStatus === "DISCONNECTED"
    ) {
      connectToRealtime();
    }
  }, [selectedAgentName, sessionStatus, autoConnectEnabled, selectedRealtimeModel]);

  useEffect(() => {
    if (!selectedAgentName) return;
    if (prevAgentNameRef.current === selectedAgentName) return;
    prevAgentNameRef.current = selectedAgentName;
    setBoardContentKey("CLEAN");
    addTranscriptBreadcrumb("Board", { action: "CLEAN", reason: "agent_change" });
  }, [selectedAgentName, addTranscriptBreadcrumb]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      updateSession(!handoffTriggeredRef.current);
      // Reset flag after handling so subsequent effects behave normally
      handoffTriggeredRef.current = false;
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch(
      `/api/session?model=${encodeURIComponent(selectedRealtimeModel)}`,
    );
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const agentSetKey = searchParams.get("agentConfig") || "default";
    if (sdkScenarioMap[agentSetKey]) {
      if (sessionStatus !== "DISCONNECTED") return;
      setSessionStatus("CONNECTING");

      try {
        const EPHEMERAL_KEY = await fetchEphemeralKey();
        if (!EPHEMERAL_KEY) return;

        // Ensure the selectedAgentName is first so that it becomes the root
        const reorderedAgents = [...sdkScenarioMap[agentSetKey]];
        const idx = reorderedAgents.findIndex((a) => a.name === selectedAgentName);
        if (idx > 0) {
          const [agent] = reorderedAgents.splice(idx, 1);
          reorderedAgents.unshift(agent);
        }

        const companyNameMap: Record<string, string> = {
          customerServiceRetail: customerServiceRetailCompanyName,
          chatSupervisor: chatSupervisorCompanyName,
          universityTutor: universityTutorInstitutionName,
        };
        const companyName = companyNameMap[agentSetKey] ?? chatSupervisorCompanyName;
        const guardrail = createModerationGuardrail(companyName);

        await connect({
          getEphemeralKey: async () => EPHEMERAL_KEY,
          initialAgents: reorderedAgents,
          audioElement: sdkAudioElement,
          outputGuardrails: [guardrail],
          extraContext: {
            addTranscriptBreadcrumb,
            handleBoardContentAction,
          },
          model: selectedRealtimeModel,
        });
        console.log(
          `[Tutor-ia] Sesión conectada con modelo ${selectedRealtimeModel}`,
        );
      } catch (err) {
        console.error("Error connecting via SDK:", err);
        setSessionStatus("DISCONNECTED");
      }
      return;
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Reflect Push-to-Talk UI state by (de)activating server VAD on the
    // backend. The Realtime SDK supports live session updates via the
    // `session.update` event.
    const turnDetection = isPTTActive
      ? null
      : {
          type: 'server_vad',
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        };

    sendEvent({
      type: 'session.update',
      session: {
        turn_detection: turnDetection,
      },
    });

    // Send an initial 'hi' message to trigger the agent to greet the user
    if (shouldTriggerResponse) {
      sendSimulatedUserMessage('hi');
    }
    return;
  }

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    interrupt();

    try {
      sendUserText(userText.trim());
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }

    setUserText("");
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');

    // No placeholder; we'll rely on server transcript once ready.
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking)
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      setAutoConnectEnabled(false);
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      setAutoConnectEnabled(true);
      connectToRealtime();
    }
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentConfig = e.target.value;
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", newAgentConfig);
    window.location.replace(url.toString());
  };

  const handleSelectedAgentChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newAgentName = e.target.value;
    // Reconnect session with the newly selected agent as root so that tool
    // execution works correctly.
    disconnectFromRealtime();
    setSelectedAgentName(newAgentName);
    // connectToRealtime will be triggered by effect watching selectedAgentName
  };

  // Because we need a new connection, refresh the page when codec changes
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
    const storedRightPaneView = localStorage.getItem("rightPaneView");
    if (storedRightPaneView === "board" || storedRightPaneView === "logs") {
      setRightPaneView(storedRightPaneView as "logs" | "board");
    }
    const storedTranscriptVisible = localStorage.getItem("transcriptVisible");
    if (storedTranscriptVisible) {
      setIsTranscriptVisible(storedTranscriptVisible === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    localStorage.setItem("rightPaneView", rightPaneView);
  }, [rightPaneView]);

  useEffect(() => {
    localStorage.setItem("transcriptVisible", isTranscriptVisible.toString());
  }, [isTranscriptVisible]);

  useEffect(() => {
    localStorage.setItem("realtimeModel", selectedRealtimeModel);
    if (sessionStatus !== "DISCONNECTED") {
      disconnectFromRealtime();
      setAutoConnectEnabled(true);
    }
  }, [selectedRealtimeModel]);

  useEffect(() => {
    if (!isSettingsMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target as Node)
      ) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSettingsMenuOpen]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }

    // Toggle server-side audio stream mute so bandwidth is saved when the
    // user disables playback. 
    try {
      mute(!isAudioPlaybackEnabled);
    } catch (err) {
      console.warn('Failed to toggle SDK mute', err);
    }
  }, [isAudioPlaybackEnabled]);

  // Ensure mute state is propagated to transport right after we connect or
  // whenever the SDK client reference becomes available.
  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('mute sync after connect failed', err);
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  const agentSetKey = searchParams.get("agentConfig") || "default";

  return (
    <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
      <div className="p-5 text-lg font-semibold flex justify-between items-center">
        <div
          className="flex items-center cursor-pointer gap-4"
          onClick={() => window.location.reload()}
        >
          <div className="flex items-center">
            <Image
              src="/tutor-ia-uveg-logo.jpg"
              alt="Tutor-IA UVEG"
              width={160}
              height={160}
              className="object-contain max-w-[160px] mix-blend-multiply"
            />
          </div>
          <div className="text-3xl font-semibold text-gray-900">Tutor-ia</div>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="relative" ref={settingsMenuRef}>
            <button
              type="button"
              onClick={() => setIsSettingsMenuOpen((prev) => !prev)}
              className="border border-gray-300 rounded-lg text-base px-3 py-1 cursor-pointer font-normal hover:bg-gray-100 whitespace-nowrap"
              aria-label="Abrir menú de configuración"
            >
              ☰
            </button>
            {isSettingsMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-xl p-4 space-y-4 z-20">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Modelo
                  </label>
                  <select
                    value={selectedRealtimeModel}
                    onChange={(e) => setSelectedRealtimeModel(e.target.value)}
                    className="border border-gray-300 rounded-md text-sm px-2 py-1 w-full focus:outline-none"
                  >
                    <option value="gpt-realtime-mini">gpt-realtime-mini</option>
                    <option value="gpt-realtime">gpt-realtime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Scenario
                  </label>
                  <div className="relative">
                    <select
                      value={agentSetKey}
                      onChange={handleAgentChange}
                      className="appearance-none border border-gray-300 rounded-md text-sm px-2 py-1 pr-8 w-full focus:outline-none"
                    >
                      {Object.keys(allAgentSets).map((agentKey) => (
                        <option key={agentKey} value={agentKey}>
                          {agentKey}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500">
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {agentSetKey && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Agent
                    </label>
                    <div className="relative">
                      <select
                        value={selectedAgentName}
                        onChange={handleSelectedAgentChange}
                        className="appearance-none border border-gray-300 rounded-md text-sm px-2 py-1 pr-8 w-full focus:outline-none"
                      >
                        {selectedAgentConfigSet?.map((agent) => (
                          <option key={agent.name} value={agent.name}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500">
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium text-gray-600">Panel lateral</span>
                    <input
                      type="checkbox"
                      checked={isEventsPaneExpanded}
                      onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                  <div className="inline-flex rounded-md border border-gray-300 overflow-hidden w-full">
                    <button
                      type="button"
                      onClick={() => setRightPaneView("logs")}
                      className={`flex-1 px-2 py-1 text-sm ${
                        rightPaneView === "logs"
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-700"
                      }`}
                    >
                      Log
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightPaneView("board")}
                      className={`flex-1 px-2 py-1 text-sm ${
                        rightPaneView === "board"
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-700"
                      }`}
                    >
                      Board
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-600">Transcript</span>
                    <input
                      type="checkbox"
                      checked={isTranscriptVisible}
                      onChange={(e) => setIsTranscriptVisible(e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Codec
                  </label>
                  <select
                    value={urlCodec}
                    onChange={(e) => handleCodecChange(e.target.value)}
                    className="border border-gray-300 rounded-md text-sm px-2 py-1 w-full focus:outline-none"
                  >
                    <option value="opus">Opus (48 kHz)</option>
                    <option value="pcmu">PCMU (8 kHz)</option>
                    <option value="pcma">PCMA (8 kHz)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-600">Audio playback</span>
                    <input
                      type="checkbox"
                      checked={isAudioPlaybackEnabled}
                      onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
                      className="w-4 h-4"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-2 px-2 overflow-hidden relative">
        {isTranscriptVisible && (
          <div className="flex flex-1 min-w-0">
            <Transcript
              userText={userText}
              setUserText={setUserText}
              onSendMessage={handleSendTextMessage}
              downloadRecording={downloadRecording}
              canSend={sessionStatus === "CONNECTED"}
            />
          </div>
        )}

        {rightPaneView === "logs" ? (
          <Events
            isExpanded={isEventsPaneExpanded}
            expandedWidthClass={
              isTranscriptVisible ? "w-1/2 overflow-auto" : "w-full overflow-auto"
            }
          />
        ) : (
          <Board
            isExpanded={isEventsPaneExpanded}
            expandedWidthClass={
              isTranscriptVisible ? "w-1/2 overflow-auto" : "w-full overflow-auto"
            }
            contentKey={boardContentKey}
          />
        )}
      </div>

      <BottomToolbar
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
      />
    </div>
  );
}

export default App;
