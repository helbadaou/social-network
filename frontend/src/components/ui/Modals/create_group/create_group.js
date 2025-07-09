"use client";
import { useEffect } from "react";
import styles from "./create_group.module.css";
export default function CreateGroupModal({
  setShow,
  handleSubmit,
  err,
  loading,
  formRef,
}) {
  useEffect(() => {
    console.log(err);
  }, [err]);

  return (
    <div className={styles.modal}>
      <div className={styles.modal_content}>
        <div className={styles.modal_header}>
          <h2 className={styles.modal_title}>Create Group</h2>
          <button
            className={styles.close_button}
            onClick={() => setShow(false)}
          >
            X
          </button>
        </div>
        <div className={styles.modal_body}>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className={styles.form_group}>
              <label className={styles.form_label} htmlFor="group_name">
                Group Name
              </label>
              <input
                className={styles.form_input}
                type="text"
                id="group_name"
                name="title"
              />
            </div>
            <div className={styles.form_group}>
              <label className={styles.form_label} htmlFor="group_description">
                Group Description
              </label>
              <textarea
                className={styles.form_input}
                id="group_description"
                name="description"
              />
            </div>
            <div className={styles.form_group}>
              <label className={styles.form_label} htmlFor="group_image">
                Group Image:
              </label>
              <input
                className={styles.form_input_file}
                type="file"
                id="group_image"
                name="image"
              />
            </div>
            <button className={styles.form_button} disabled={loading}>
              Create
            </button>
            {err && <p className={styles.error}>{err}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
