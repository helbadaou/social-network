// components/Post.js
export default function Post({ post, fetchUserById }) {
  return (
    <div>
      <div onClick={() => fetchUserById(post.author_id)}>
        <img src={post.author_avatar || '/avatar.png'} alt="Avatar" />
        <p>{post.author_name}</p>
      </div>
      <p>{post.content}</p>
      {post.image_url && <img src={post.image_url} alt="Post" />}
    </div>
  );
}
