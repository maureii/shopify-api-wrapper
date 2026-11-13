export const GET_PRODUCTS_QUERY = `
  {
    products {
      edges {
        node {
          id
          compareAtPriceRange {
            maxVariantCompareAtPrice {
              amount
            }
          }
          variants {
            edges {
              node {
                id
                price
                sku
              }
            }
          }
          title
          descriptionHtml
          handle
          vendor
          tags
          productType
          totalInventory
          status
          mediaCount {
            count
          }
          media {
            edges {
              node {
                ... on MediaImage {
                  id
                }
              }
            }
          }
          metafields(first: 100, namespace: "custom") {
            edges {
              node {
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
    }
  }
`;