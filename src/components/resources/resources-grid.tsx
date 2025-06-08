import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye, Video, Image, File } from "lucide-react";

const resources = [
  {
    id: 1,
    name: "Sales Script Templates",
    type: "document",
    category: "Sales",
    department: "Sales",
    description: "Collection of proven sales scripts for different scenarios",
    uploadDate: "2024-01-10",
    size: "2.3 MB",
    tags: ["Scripts", "Templates", "Cold Calling"],
  },
  {
    id: 2,
    name: "AI Automation Demo Video",
    type: "video",
    category: "Demo",
    department: "Marketing",
    description: "Product demonstration video for client presentations",
    uploadDate: "2024-01-08",
    size: "45.2 MB",
    tags: ["Demo", "Video", "AI"],
  },
  {
    id: 3,
    name: "Onboarding Checklist",
    type: "document",
    category: "Process",
    department: "Operations",
    description: "Step-by-step client onboarding process documentation",
    uploadDate: "2024-01-05",
    size: "1.1 MB",
    tags: ["Onboarding", "Process", "Checklist"],
  },
  {
    id: 4,
    name: "Brand Guidelines",
    type: "image",
    category: "Brand",
    department: "Marketing",
    description: "Company brand guidelines and visual identity standards",
    uploadDate: "2024-01-03",
    size: "8.7 MB",
    tags: ["Brand", "Guidelines", "Design"],
  },
  {
    id: 5,
    name: "Proposal Template",
    type: "document",
    category: "Templates",
    department: "Sales",
    description: "Standard proposal template for AI automation projects",
    uploadDate: "2024-01-01",
    size: "3.4 MB",
    tags: ["Proposal", "Template", "Sales"],
  },
  {
    id: 6,
    name: "Technical Specifications",
    type: "document",
    category: "Technical",
    department: "Engineering",
    description: "Technical requirements and specifications document",
    uploadDate: "2023-12-28",
    size: "5.2 MB",
    tags: ["Technical", "Specs", "Engineering"],
  },
];

const getFileIcon = (type: string) => {
  switch (type) {
    case "video":
      return Video;
    case "image":
      return Image;
    case "document":
      return FileText;
    default:
      return File;
  }
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Sales: "bg-blue-100 text-blue-800",
    Demo: "bg-purple-100 text-purple-800",
    Process: "bg-green-100 text-green-800",
    Brand: "bg-pink-100 text-pink-800",
    Templates: "bg-yellow-100 text-yellow-800",
    Technical: "bg-gray-100 text-gray-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
};

export function ResourcesGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {resources.map((resource) => {
        const FileIcon = getFileIcon(resource.type);
        
        return (
          <Card key={resource.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">{resource.name}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">{resource.size}</p>
                  </div>
                </div>
                <Badge className={getCategoryColor(resource.category)}>
                  {resource.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">{resource.description}</p>
                
                <div className="flex flex-wrap gap-1">
                  {resource.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{resource.department}</span>
                  <span>{new Date(resource.uploadDate).toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}