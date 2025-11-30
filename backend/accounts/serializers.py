from django.contrib.auth import get_user_model
from rest_framework import serializers


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password2"):
            raise serializers.ValidationError({"password": "Passwords must match"})
        # Ensure username is unique
        username = attrs.get("username")
        if username and User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "A user with that username already exists"})
        return attrs

    def create(self, validated_data):
        username = validated_data["username"]
        email = validated_data.get("email", "")
        password = validated_data["password"]
        # Use the model manager's create_user (sets password correctly and respects custom user models)
        user = User.objects.create_user(username=username, email=email, password=password)
        return user
