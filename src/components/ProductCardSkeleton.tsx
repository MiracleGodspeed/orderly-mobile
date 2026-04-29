import { View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

export function ProductCardSkeleton() {
  return (
    <View className="w-[48%] bg-white rounded-3xl mb-4 overflow-hidden shadow-sm">
      <SkeletonPlaceholder backgroundColor="#f1f5f9" highlightColor="#ffffff">
        <SkeletonPlaceholder.Item>
          <SkeletonPlaceholder.Item width="100%" height={176} />
          <SkeletonPlaceholder.Item padding={14}>
            <SkeletonPlaceholder.Item
              width="85%"
              height={14}
              borderRadius={4}
            />
            <SkeletonPlaceholder.Item
              marginTop={8}
              width="55%"
              height={14}
              borderRadius={4}
            />
            <SkeletonPlaceholder.Item
              marginTop={16}
              width="45%"
              height={18}
              borderRadius={4}
            />
            <SkeletonPlaceholder.Item
              marginTop={12}
              flexDirection="row"
              justifyContent="space-between"
            >
              <SkeletonPlaceholder.Item
                width={60}
                height={18}
                borderRadius={6}
              />
              <SkeletonPlaceholder.Item
                width={30}
                height={18}
                borderRadius={6}
              />
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    </View>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View className="flex-row flex-wrap justify-between px-1">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </View>
  );
}
