import { useCallback, useRef, useState, useEffect } from 'react';
import {
  RealtimeSession,
  RealtimeAgent,
  OpenAIRealtimeWebRTC,
} from '@openai/agents/realtime';

import { applyCodecPreferences } from '../lib/codecUtils';
import { useEvent } from '../contexts/EventContext';
import { useHandleSessionHistory } from './useHandleSessionHistory';
import { SessionStatus } from '../types';

export interface RealtimeSessionCallbacks {
  onConnectionChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (agentName: string) => void;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  initialAgents: RealtimeAgent[];
  audioElement?: HTMLAudioElement;
  mediaStream?: MediaStream;
  extraContext?: Record<string, any>;
  outputGuardrails?: any[];
  model?: string;
}

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const fallbackAudioContextRef = useRef<AudioContext | null>(null);
  const fallbackAudioSourceRef = useRef<ConstantSourceNode | OscillatorNode | null>(null);
  const fallbackMediaStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<
    SessionStatus
  >('DISCONNECTED');
  const { logClientEvent } = useEvent();

  const updateStatus = useCallback(
    (s: SessionStatus) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks],
  );

  const { logServerEvent } = useEvent();

  const historyHandlers = useHandleSessionHistory().current;

  function handleTransportEvent(event: any) {
    // Handle additional server events that aren't managed by the session
    switch (event.type) {
      case "conversation.item.input_audio_transcription.completed": {
        historyHandlers.handleTranscriptionCompleted(event);
        break;
      }
      case "response.audio_transcript.done": {
        historyHandlers.handleTranscriptionCompleted(event);
        break;
      }
      case "response.audio_transcript.delta": {
        historyHandlers.handleTranscriptionDelta(event);
        break;
      }
      default: {
        logServerEvent(event);
        break;
      } 
    }
  }

  const codecParamRef = useRef<string>(
    (typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('codec') ?? 'opus')
      : 'opus')
      .toLowerCase(),
  );

  // Wrapper to pass current codec param.
  // This lets you use the codec selector in the UI to force narrow-band (8 kHz) codecs to
  // simulate how the voice agent sounds over a PSTN/SIP phone call.
  const applyCodec = useCallback(
    (pc: RTCPeerConnection) => applyCodecPreferences(pc, codecParamRef.current),
    [],
  );

  const handleAgentHandoff = (item: any) => {
    const history = item.context.history;
    const lastMessage = history[history.length - 1];
    const agentName = lastMessage.name.split("transfer_to_")[1];
    callbacks.onAgentHandoff?.(agentName);
  };

  useEffect(() => {
    if (sessionRef.current) {
      // Log server errors
      sessionRef.current.on("error", (...args: any[]) => {
        logServerEvent({
          type: "error",
          message: args[0],
        });
      });

      // history events
      sessionRef.current.on("agent_handoff", handleAgentHandoff);
      sessionRef.current.on("agent_tool_start", historyHandlers.handleAgentToolStart);
      sessionRef.current.on("agent_tool_end", historyHandlers.handleAgentToolEnd);
      sessionRef.current.on("history_updated", historyHandlers.handleHistoryUpdated);
      sessionRef.current.on("history_added", historyHandlers.handleHistoryAdded);
      sessionRef.current.on("guardrail_tripped", historyHandlers.handleGuardrailTripped);

      // additional transport events
      sessionRef.current.on("transport_event", handleTransportEvent);
    }
  }, [sessionRef.current]);

  const connect = useCallback(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      mediaStream,
      extraContext,
      outputGuardrails,
      model,
    }: ConnectOptions) => {
      if (sessionRef.current) return; // already connected

      updateStatus('CONNECTING');

      const ek = await getEphemeralKey();
      if (!ek) {
        updateStatus('DISCONNECTED');
        return;
      }
      const rootAgent = initialAgents[0];

      let resolvedMediaStream = mediaStream;
      if (!resolvedMediaStream && typeof window !== 'undefined') {
        try {
          resolvedMediaStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
        } catch (error) {
          const mediaError = error as DOMException;
          if (mediaError?.name !== 'NotFoundError') {
            throw error;
          }

          const AudioContextCtor =
            window.AudioContext ||
            ((window as typeof window & { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext as typeof AudioContext | undefined);

          if (!AudioContextCtor) {
            throw error;
          }

          const audioContext = new AudioContextCtor();
          const destination = audioContext.createMediaStreamDestination();
          const source =
            typeof audioContext.createConstantSource === 'function'
              ? audioContext.createConstantSource()
              : audioContext.createOscillator();

          if ('offset' in source) {
            source.offset.value = 0;
          }
          if ('frequency' in source) {
            source.frequency.value = 0;
          }

          source.connect(destination);
          source.start();

          fallbackAudioContextRef.current = audioContext;
          fallbackAudioSourceRef.current = source;
          fallbackMediaStreamRef.current = destination.stream;
          resolvedMediaStream = destination.stream;

          logClientEvent(
            { reason: mediaError.name },
            'warning.microphone_not_found_using_silent_stream',
          );
        }
      }

      sessionRef.current = new RealtimeSession(rootAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement,
          mediaStream: resolvedMediaStream,
          // Set preferred codec before offer creation
          changePeerConnection: async (pc: RTCPeerConnection) => {
            applyCodec(pc);
            return pc;
          },
        }),
        model: model ?? 'gpt-realtime',
        config: {
          inputAudioTranscription: {
            model: 'gpt-4o-mini-transcribe',
          },
        },
        outputGuardrails: outputGuardrails ?? [],
        context: extraContext ?? {},
      });

      await sessionRef.current.connect({ apiKey: ek });
      updateStatus('CONNECTED');
    },
    [callbacks, updateStatus],
  );

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    fallbackMediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    fallbackMediaStreamRef.current = null;
    fallbackAudioSourceRef.current?.disconnect();
    fallbackAudioSourceRef.current = null;
    void fallbackAudioContextRef.current?.close();
    fallbackAudioContextRef.current = null;
    updateStatus('DISCONNECTED');
  }, [updateStatus]);

  const assertconnected = () => {
    if (!sessionRef.current) throw new Error('RealtimeSession not connected');
  };

  /* ----------------------- message helpers ------------------------- */

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);
  
  const sendUserText = useCallback((text: string) => {
    assertconnected();
    sessionRef.current!.sendMessage(text);
  }, []);

  const sendEvent = useCallback((ev: any) => {
    sessionRef.current?.transport.sendEvent(ev);
  }, []);

  const mute = useCallback((m: boolean) => {
    sessionRef.current?.mute(m);
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.clear' } as any);
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.commit' } as any);
    sessionRef.current.transport.sendEvent({ type: 'response.create' } as any);
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt,
  } as const;
}
