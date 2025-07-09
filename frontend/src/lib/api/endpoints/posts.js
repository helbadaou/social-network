import fetchClient from "../client";

export const getPosts = async () => {
  return fetchClient("/posts");
};

export const getPostById = async (id) => {
  return fetchClient(`/posts/${id}`);
};

export const createPost = async (data) => {
  return fetchClient("/posts", {
    method: "POST",
    body: data,
  });
};
