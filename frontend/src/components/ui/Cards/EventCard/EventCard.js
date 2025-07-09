"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import fetchClient from "@/lib/api/client";
import styles from "./EventCard.module.css";

export default function EventCard({ event, groupId, onResponseUpdate }) {
  const { user } = useAuth();
  const [userResponse, setUserResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState({ going: 0, notGoing: 0 });

  // Charger la réponse de l'utilisateur et les statistiques
  useEffect(() => {
    const loadEventData = async () => {
      try {
        // Charger la réponse de l'utilisateur actuel
        const userResponseData = await fetchClient(`/api/group/${groupId}/event/${event.id}/user-response`);
        if (userResponseData.data) {
          setUserResponse(userResponseData.data.response);
        }

        // Charger les statistiques des réponses
        const responsesData = await fetchClient(`/api/group/${groupId}/event/${event.id}/responses`);
        if (responsesData.data) {
          const goingCount = responsesData.data.filter(r => r.response === 'YES').length;
          const notGoingCount = responsesData.data.filter(r => r.response === 'NO').length;
          setResponses({ going: goingCount, notGoing: notGoingCount });
        }
      } catch (error) {
        console.error("Error loading event data:", error);
      }
    };

    loadEventData();
  }, [event.id, groupId]);

  const handleResponse = async (response) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await fetchClient(`/api/group/${groupId}/event/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          eventId: event.id,
          response: response
        }
      });

      setUserResponse(response);
      
      // Mettre à jour les statistiques
      if (userResponse === 'YES' && response !== 'YES') {
        setResponses(prev => ({ ...prev, going: prev.going - 1 }));
      } else if (userResponse === 'NO' && response !== 'NO') {
        setResponses(prev => ({ ...prev, notGoing: prev.notGoing - 1 }));
      }
      
      if (response === 'YES') {
        setResponses(prev => ({ ...prev, going: prev.going + 1 }));
      } else if (response === 'NO') {
        setResponses(prev => ({ ...prev, notGoing: prev.notGoing + 1 }));
      }

      onResponseUpdate?.();
    } catch (error) {
      console.error("Error responding to event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.eventCard}>
      <div className={styles.eventHeader}>
        <h3 className={styles.eventTitle}>{event.title}</h3>
        <div className={styles.eventDates}>
          <span className={styles.dateLabel}>Début:</span>
          <span className={styles.dateValue}>{formatDate(event.start)}</span>
          <span className={styles.dateLabel}>Fin:</span>
          <span className={styles.dateValue}>{formatDate(event.end)}</span>
        </div>
      </div>

      {event.description && (
        <p className={styles.eventDescription}>{event.description}</p>
      )}

      <div className={styles.responseSection}>
        <div className={styles.responseButtons}>
          <button
            className={`${styles.responseBtn} ${styles.goingBtn} ${
              userResponse === 'YES' ? styles.active : ''
            }`}
            onClick={() => handleResponse('YES')}
            disabled={isLoading}
          >
            {isLoading && userResponse === 'YES' ? '...' : 'Going'}
          </button>
          
          <button
            className={`${styles.responseBtn} ${styles.notGoingBtn} ${
              userResponse === 'NO' ? styles.active : ''
            }`}
            onClick={() => handleResponse('NO')}
            disabled={isLoading}
          >
            {isLoading && userResponse === 'NO' ? '...' : 'Not Going'}
          </button>
        </div>

        <div className={styles.responseStats}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{responses.going}</span>
            <span className={styles.statLabel}>Going</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{responses.notGoing}</span>
            <span className={styles.statLabel}>Not Going</span>
          </div>
        </div>
      </div>
    </div>
  );
} 