"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";
import bg from "../../../../public/register_bg.png";
import Image from "next/image";
import { isValidEmail, isStrongPassword } from "@/lib/validate";
import fetchClient from "@/lib/api/client";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();


  async function Login() {
    if (emailErr.length) {
      setEmailErr("Type a valid email");
      return;
    }
    if (passwordErr.length) {
      setPasswordErr(
        "Password should be at least 8 characters, 1 uppercase, 1 lowercase and 1 number"
      );
      return;
    }

    try {
      const res = await fetchClient("/api/login", {
        method: "POST",
        body: { email, password },
      });
      localStorage.setItem("token", res.data.session_id);
      const setCookie = (name, value, days) => {
        let expires = "";

        if (days) {
          const date = new Date();
          date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
          expires = `; expires=${date.toUTCString()}`;
        }

        document.cookie = `${name}=${encodeURIComponent(
          value
        )}${expires}; path=/`;
      };
      setCookie("token", res.data.session_id, 30);
      router.push("/");
    } catch (e) {
      setError(e.message);
    }
  }

  function handleTyping(e) {
    switch (e?.currentTarget?.type) {
      case "email":
        {
          let content = e.target.value;
          if (!isValidEmail(content)) {
            setEmailErr("Type a valid email");
          } else {
            setEmailErr("");
          }
          setEmail(content);
        }
        break;
      case "password": {
        let content = e.target.value;
        if (!isStrongPassword(content)) {
          setPasswordErr(
            "Password should be at least 8 characters, 1 uppercase, 1 lowercase and 1 number"
          );
        } else {
          setPasswordErr("");
        }
        setPassword(content);
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.login_container}>
        <div className={styles.login_form}>
          <div className={styles.header}>
            <h5>WELCOME BACK</h5>
            <h1>Login.</h1>
            <p>
              Not a member? <Link href={"/register"}>Register</Link>
            </p>
            {note && <p className={styles.note}>{note}</p>}
          </div>
          <div className={styles.inputs_container}>
            <div className={styles.input_field}>
              <input
                type="email"
                placeholder="Type your email here"
                value={email}
                onChange={handleTyping}
              />
              {emailErr?.length > 0 && (
                <p className={styles.error}>{emailErr}</p>
              )}
            </div>

            <div className={styles.input_field}>
              <input
                type="password"
                placeholder="Your Password"
                value={password}
                onChange={handleTyping}
              />
              {passwordErr?.length > 0 && (
                <p className={styles.error}>{passwordErr}</p>
              )}
            </div>

            <div className={styles.actions}>
              <button onClick={Login} className={styles.login_button}>
                Login
              </button>
            </div>

            {error?.length !== 0 && <p>{error}</p>}
          </div>
        </div>
        <div className={styles.image_container}>
          <img
            src={bg.src}
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
            alt="People around campfire"
          />
        </div>
      </div>
    </div>
  );
}
