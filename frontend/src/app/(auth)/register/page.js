"use client";

import styles from "./register.module.css";
import Image from "next/image";
import bg from "../../../../public/register_bg.png";
import { useState } from "react";
import {
  isStrongPassword,
  isValidAvatar,
  isValidDate,
  isValidEmail,
  isValidNames,
  isValidNickName,
  isValidBio,
} from "@/lib/validate";
import fetchClient from "@/lib/api/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const [fileInputRef, setFileInputRef] = useState(null);
  const [formState, setFormState] = useState({
    values: {
      firstname: "",
      lastname: "",
      nickname: "",
      dob: "",
      email: "",
      password: "",
      avatar: "",
      bio: "",
    },
    errors: {
      firstname: "",
      lastname: "",
      nickname: "",
      dob: "",
      email: "",
      password: "",
      avatar: "",
      bio: "",
    },
    isValid: false,
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "firstname":
      case "lastname":
        error =
          isValidNames(value) && value?.length > 0
            ? ""
            : "Lastname and Firstname must be at least 2 characters and contain only letters.";
        break;
      case "nickname":
        error = isValidNickName(value)
          ? ""
          : "Nickname must be at least 2 characters and contain only letters, numbers and underscore";
        break;
      case "dob":
        error = value && isValidDate(value) ? "" : "Invalid date";
        break;
      case "email":
        error = value.length > 0 && isValidEmail(value) ? "" : "Invalid email";
        break;
      case "password":
        error =
          value.length > 0 && isStrongPassword(value)
            ? ""
            : "Password must be at least 8 characters, contain at least one uppercase letter, one lowercase letter, one number and one special character";

        break;
      case "bio":
        error = isValidBio(value) ? "" : "Maximum length is 100 characters";
        break;
      case "avatar":
        error = isValidAvatar(value)
          ? ""
          : "Avatar must be a valid image format and also size must be less than 5MB";
        break;
    }

    setFormState((prev) => ({
      ...prev,
      errors: {
        ...prev.errors,
        [name]: error,
      },
    }));
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [name]: files ? files[0] : value,
      },
    }));

    if (e.target.type === "file") {
      validateField(name, files[0]);
    } else {
      validateField(name, value);
    }

    const isValid = Object.values(formState.errors).every((err) => err === "");

    setFormState((prev) => ({ ...prev, isValid }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    let error = "";

    if (file && !isValidAvatar(file)) {
      error = "Avatar must be an jpg|jpeg|png|gif image and less than 5MB";
    }

    setFormState((prev) => ({
      values: {
        ...prev.values,
        avatar: file,
      },
      errors: {
        ...prev.errors,
        avatar: error,
      },
      isValid: prev.isValid && !error,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { values, isValid, errors } = formState;

    // if (!isValid) return;

    // create form from values
    const formData = new FormData();
    Object.keys(values).forEach((key) => {
      if (key == "dob") {
        formData.append("date_of_birth", values[key]);
      } else {
        formData.append(key, values[key]);
      }
    });

    try {
      await fetchClient("/api/register", {
        method: "POST",
        body: formData,
      });
      router.push("/login?n=user_created");
    } catch (e) {
      setErr(e.message);
      setTimeout(() => {
        setErr("");
      }, 3000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.register_container}>
        <div className={styles.register_form}>
          <div className={styles.header}>
            <h5>START FOR FREE</h5>
            <h1>Create new account.</h1>
            <p>
              Already a member? <Link href={"/login"}>Login</Link>
            </p>
          </div>

          <div className={styles.inputs_container}>
            {/* First row: First name & Last name side by side */}
            <div className={`${styles.input_row} ${styles.first_row}`}>
              <div className={styles.inputs}>
                <div className={styles.input_field}>
                  <input
                    type="text"
                    name="firstname"
                    placeholder="first name"
                    value={formState.values.firstname}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.input_field}>
                  <input
                    type="text"
                    name="lastname"
                    placeholder="last name"
                    value={formState.values.lastname}
                    onChange={handleChange}
                  />
                </div>
              </div>
              {formState.errors.firstname?.length !== 0 && (
                <p className={styles.error}>{formState.errors.firstname}</p>
              )}
            </div>

            {/* Second row: Nickname & DOB side by side */}
            <div className={styles.input_row}>
              <div className={styles.input_field}>
                <input
                  type="text"
                  name="nickname"
                  placeholder="nickname(optional)"
                  value={formState.values.nickname}
                  onChange={handleChange}
                />
                {formState.errors.nickname?.length !== 0 && (
                  <p className={styles.error}>{formState.errors.nickname}</p>
                )}
              </div>

              <div className={styles.input_field}>
                <input
                  type="date"
                  name="dob"
                  placeholder="date of birth"
                  value={formState.values.dob}
                  onChange={handleChange}
                />
                {formState.errors.dob?.length !== 0 && (
                  <p className={styles.error}>{formState.errors.dob}</p>
                )}
              </div>
            </div>

            {/* Single column inputs below */}
            <div className={styles.input_field}>
              <input
                type="email"
                name="email"
                placeholder="email"
                value={formState.values.email}
                onChange={handleChange}
              />
              {formState.errors.email?.length !== 0 && (
                <p className={styles.error}>{formState.errors.email}</p>
              )}
            </div>

            <div className={styles.input_field}>
              <input
                type="password"
                name="password"
                placeholder="password"
                value={formState.values.password}
                onChange={handleChange}
              />
              {formState.errors.password?.length !== 0 && (
                <p className={styles.error}>{formState.errors.password}</p>
              )}
            </div>

            <div className={styles.input_field}>
              <input
                type="file"
                name="avatar"
                accept="image/jpg, image/jpeg, image/png, image/gif"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
              {formState.errors.avatar?.length !== 0 && (
                <p className={styles.error}>{formState.errors.avatar}</p>
              )}
            </div>

            <div className={styles.input_field}>
              <textarea
                name="bio"
                placeholder="about me (optional)"
                className={styles.bio_input}
                value={formState.values.bio}
                onChange={handleChange}
              ></textarea>
              {formState.errors.bio?.length !== 0 && (
                <p className={styles.error}>{formState.errors.bio}</p>
              )}
            </div>
            {err && <p className={styles.error}>{err}</p>}
            <div className={styles.actions}>
              <button className={styles.register_button} onClick={handleSubmit}>
                Sign-up
              </button>
            </div>
          </div>
        </div>
        <div className={styles.image_container}>
          <div className={styles.image_overlay}></div>
          <img
            src={bg.src}
            alt="People around campfire"
            style={{ objectFit: "cover", width: "100%", height: "100%" }}
            value={formState.values.firstname}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}
