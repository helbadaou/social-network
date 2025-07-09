"use client";

import styles from "./create_event.module.css";
import { useState } from "react";
import fetchClient from "@/lib/api/client";

export default function CreateEventModal({ show, setShow, groupId, onEventCreated }) {
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    event_date_start: "",
    event_date_end: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Validate inputs
    if (!eventData.title.trim()) {
      setError("Please enter an event title");
      return;
    }
    if (!eventData.description.trim()) {
      setError("Please enter an event description");
      return;
    }
    if (!eventData.event_date_start || !eventData.event_date_end) {
      setError("Please select both start and end dates");
      return;
    }

    const today = new Date();
    const startDate = new Date(eventData.event_date_start);
    const endDate = new Date(eventData.event_date_end);

    if (startDate < today) {
      setError("Start date cannot be in the past");
      return;
    }
    if (endDate <= startDate) {
      setError("End date must be after start date");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchClient(`/api/group/${groupId}/event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          ...eventData,
          groupId: Number(groupId),
        },
      });

      onEventCreated?.();
      setEventData({
        title: "",
        description: "",
        event_date_start: "",
        event_date_end: "",
      });
      setShow(false);
    } catch (err) {
      setError(err.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className={styles.modal} onClick={() => setShow(false)}>
      <div className={styles.modal_content} onClick={e => e.stopPropagation()}>
        <div className={styles.modal_header}>
          <h2 className={styles.modal_title}>Create Event</h2>
          <button
            className={styles.close_button}
            onClick={() => setShow(false)}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className={styles.modal_body}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.form_group}>
              <label htmlFor="title" className={styles.label}>
                Event Title
              </label>
              <input
                id="title"
                type="text"
                name="title"
                className={styles.input}
                value={eventData.title}
                onChange={handleChange}
                placeholder="Enter event title"
                disabled={loading}
              />
            </div>

            <div className={styles.form_group}>
              <label htmlFor="description" className={styles.label}>
                Description
              </label>
              <textarea
                id="description"
                name="description"
                className={styles.textarea}
                value={eventData.description}
                onChange={handleChange}
                placeholder="Enter event description"
                rows="4"
                disabled={loading}
              />
            </div>

            <div className={styles.date_group}>
              <div className={styles.form_group}>
                <label htmlFor="event_date_start" className={styles.label}>
                  Start Date & Time
                </label>
                <input
                  id="event_date_start"
                  type="datetime-local"
                  name="event_date_start"
                  className={styles.input}
                  value={eventData.event_date_start}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className={styles.form_group}>
                <label htmlFor="event_date_end" className={styles.label}>
                  End Date & Time
                </label>
                <input
                  id="event_date_end"
                  type="datetime-local"
                  name="event_date_end"
                  className={styles.input}
                  value={eventData.event_date_end}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {error && <p className={styles.error_message}>{error}</p>}

            <div className={styles.action_buttons}>
              <button
                type="button"
                className={styles.cancel_button}
                onClick={() => setShow(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submit_button}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Event"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 