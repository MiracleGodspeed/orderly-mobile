import { View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

export function OrderRowSkeleton() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
      <SkeletonPlaceholder backgroundColor="#f1f5f9" highlightColor="#ffffff">
        <SkeletonPlaceholder.Item
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <SkeletonPlaceholder.Item flexDirection="row" alignItems="center">
            <SkeletonPlaceholder.Item
              width={40}
              height={40}
              borderRadius={20}
            />
            <SkeletonPlaceholder.Item marginLeft={12}>
              <SkeletonPlaceholder.Item
                width={130}
                height={14}
                borderRadius={4}
              />
              <SkeletonPlaceholder.Item
                marginTop={6}
                width={80}
                height={10}
                borderRadius={4}
              />
            </SkeletonPlaceholder.Item>
          </SkeletonPlaceholder.Item>
          <SkeletonPlaceholder.Item
            width={60}
            height={22}
            borderRadius={11}
          />
        </SkeletonPlaceholder.Item>

        <SkeletonPlaceholder.Item
          marginTop={16}
          paddingTop={12}
          flexDirection="row"
          justifyContent="space-between"
        >
          <SkeletonPlaceholder.Item width={70} height={12} borderRadius={4} />
          <SkeletonPlaceholder.Item width={90} height={16} borderRadius={4} />
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    </View>
  );
}

export function OrdersListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <OrderRowSkeleton key={i} />
      ))}
    </View>
  );
}
