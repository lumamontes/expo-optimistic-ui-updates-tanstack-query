import React, { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useSQLiteContext } from 'expo-sqlite';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Post = {
  id: number;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  created_at: string;
};

export default function TabOneScreen() {
  const db = useSQLiteContext();
  const queryClient = useQueryClient();

  const userId = 1; //For example app, we're hardcoding the user ID

  const { data: posts, isLoading, refetch } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const result = await db.getAllAsync<Post & { is_liked: boolean }>(`
        SELECT 
          posts.*, 
          CASE 
            WHEN EXISTS (
              SELECT 1 
              FROM posts_likes 
              WHERE posts_likes.post_id = posts.id AND posts_likes.user_id = ?
            ) THEN 1 
            ELSE 0 
          END AS is_liked
        FROM posts
      `, [userId]);
      return result;
    },
  });
  const togglePostMutation = useMutation({
    mutationFn: async (post: Post) => {
      const likeExists = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM posts_likes WHERE post_id = ? AND user_id = ?',
        [post.id, userId]
      );
  
      const newLikedStatus = likeExists?.count === 0; 
  
      if (newLikedStatus) {
        await db.runAsync('INSERT INTO posts_likes (post_id, user_id) VALUES (?, ?)', [post.id, userId]);
      } else {
        await db.runAsync('DELETE FROM posts_likes WHERE post_id = ? AND user_id = ?', [post.id, userId]);
      }
  
      const likeCountChange = newLikedStatus ? 1 : -1;
      const updatedLikesCount = post.likes_count + likeCountChange;
  
      await db.runAsync('UPDATE posts SET likes_count = ? WHERE id = ?', [updatedLikesCount, post.id]);
  
      return {
        ...post,
        is_liked: newLikedStatus,
        likes_count: updatedLikesCount,
      };
    },
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ['posts'], exact: true });
  
      const previousPosts = queryClient.getQueryData<Post[]>(['posts']);
  
      queryClient.setQueryData<Post[]>(['posts'], (oldPosts) =>
        oldPosts?.map((p) =>
          p.id === post.id
            ? { ...p, is_liked: !post.is_liked, likes_count: post.likes_count + (post.is_liked ? -1 : 1) }
            : p
        )
      );
  
      return { previousPosts };
    },
    onError(error, variables, context) {
      console.error('An error occurred:', error);
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
    },
    onSuccess: (updatedPost) => {
      queryClient.setQueryData<Post[]>(['posts'], (oldPosts) =>
        oldPosts?.map((post) => (post.id === updatedPost.id ? updatedPost : post))
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['posts'],
        exact: true,
      });
    },
  });

   const togglePost = (post: Post) => {
    togglePostMutation.mutate(post);
  };

  return (
    <View style={styles.container}>
      <FlatList
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.post}>
            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postContent}>{item.content}</Text>
            <Text style={styles.postMeta}>❤️ {item.likes_count ?? 0} | 💬 {item.comments_count ?? 0}</Text>
            <TouchableOpacity onPress={() => togglePost(item)}>
              <Text style={styles.postAction}>
                {item.is_liked ? 'Unlike' : 'Like'}
              </Text>
            </TouchableOpacity>
            {item.created_at && <Text style={styles.postDate}>{item.created_at}</Text>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  post: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 10,
    marginHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  postContent: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  postMeta: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
  },
  postAction: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: 'bold',
  },
  postDate: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 10,
    textAlign: 'right',
  },
});
